import Database from "better-sqlite3";
import { hashSync } from "bcryptjs";
import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";
import { INITIAL_PASSWORD, PARTNERS } from "@/lib/constants";
import { calculateScoreForQuestions } from "@/lib/logic";

export type AppDatabase = Database.Database;

declare global {
  var __retailVisitDb: AppDatabase | undefined;
}

function resolveDataPath(value: string | undefined, fallback: string) {
  const target = value || fallback;
  return path.isAbsolute(target) ? target : path.resolve(/* turbopackIgnore: true */ process.cwd(), target);
}

export const databasePath = () => resolveDataPath(process.env.DATABASE_PATH, "data/retail-visit-quality-tracker.sqlite");
export const uploadDirectory = () => resolveDataPath(process.env.UPLOAD_DIR, "data/uploads");

const schema = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS partner_regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  partner_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('MANAGER','PARTNER')),
  region_id INTEGER REFERENCES partner_regions(id),
  must_change_password INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mpc TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  region_id INTEGER NOT NULL REFERENCES partner_regions(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stores_region ON stores(region_id);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  conducted_by INTEGER NOT NULL REFERENCES users(id),
  visited_region_id INTEGER NOT NULL REFERENCES partner_regions(id),
  store_id INTEGER NOT NULL REFERENCES stores(id),
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('PLANNED','DRAFT','COMPLETED')),
  score REAL NOT NULL,
  employee_ref TEXT,
  product_detail TEXT,
  went_well TEXT,
  needs_improvement TEXT,
  comment TEXT,
  no_receipt_reason TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visits_conductor ON visits(conducted_by, completed_at);
CREATE INDEX IF NOT EXISTS idx_visits_region ON visits(visited_region_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_visits_store ON visits(store_id, completed_at);
CREATE TABLE IF NOT EXISTS visit_assignments (
  id TEXT PRIMARY KEY,
  assigned_by INTEGER NOT NULL REFERENCES users(id),
  assignee_user_id INTEGER NOT NULL REFERENCES users(id),
  target_region_id INTEGER NOT NULL REFERENCES partner_regions(id),
  store_id INTEGER NOT NULL REFERENCES stores(id),
  visit_type TEXT NOT NULL DEFAULT 'SHORT' CHECK(visit_type IN ('SHORT','EXTENDED')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','COMPLETED','CANCELLED')),
  completed_visit_id TEXT REFERENCES visits(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_assignments_assignee ON visit_assignments(assignee_user_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_assignments_region ON visit_assignments(target_region_id,status,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_pending_store
  ON visit_assignments(assignee_user_id,store_id) WHERE status='PENDING';
CREATE TABLE IF NOT EXISTS visit_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  answer INTEGER NOT NULL CHECK(answer IN (0,1)),
  UNIQUE(visit_id, question_number)
);
CREATE TABLE IF NOT EXISTS visit_photos (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pending_uploads (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pending_uploads_user ON pending_uploads(created_by, created_at);
CREATE TABLE IF NOT EXISTS visit_area_reviews (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  area_key TEXT NOT NULL CHECK(area_key IN ('warzywa_owoce','pieczywo','dania_przekaski')),
  comment TEXT,
  photo_path TEXT,
  mime_type TEXT,
  size INTEGER,
  checksum TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(visit_id, area_key)
);
CREATE INDEX IF NOT EXISTS idx_visit_area_reviews_visit ON visit_area_reviews(visit_id);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  event TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(login, ip_hash, created_at);
`;

function ensureVisitTypeColumn(db: AppDatabase) {
  const columns = db.prepare("PRAGMA table_info(visits)").all() as Array<{ name: string }>;
  if (!columns.some(column => column.name === "visit_type")) {
    db.exec("ALTER TABLE visits ADD COLUMN visit_type TEXT NOT NULL DEFAULT 'SHORT' CHECK(visit_type IN ('SHORT','EXTENDED'))");
  }
}

type StructureRow = {
  PARTNER?: string;
  "Oddzial adres"?: string;
  Miasto?: string;
  ulica?: string;
  REJ?: string;
  SKLEP?: string;
};

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function parseStoreRow(row: StructureRow) {
  const newPartnerCell = normalize(row.REJ);
  const newStoreCell = normalize(row.SKLEP);
  if (newPartnerCell && newStoreCell && newStoreCell.toLowerCase() !== "total") {
    const match = newStoreCell.match(/^([A-Z]{1,2}\d{3,4})\s+(.+)$/i);
    if (!match) throw new Error(`Nieprawidłowy sklep w Excelu: ${newStoreCell}`);
    const address = normalize(match[2]);
    return {
      partnerCell: newPartnerCell,
      mpc: normalize(match[1]).toUpperCase(),
      city: "Demo City",
      street: address.replace(/^Demo City\s+/i, "").trim(),
    };
  }
  return {
    partnerCell: normalize(row.PARTNER),
    mpc: normalize(row["Oddzial adres"]).toUpperCase(),
    city: normalize(row.Miasto),
    street: normalize(row.ulica),
  };
}

function seedStructure(db: AppDatabase) {
  const workbookPath = path.resolve(process.cwd(), "data/demo-structure.xlsx");
  if (!fs.existsSync(workbookPath)) throw new Error(`Brak pliku struktury: ${workbookPath}`);
  const workbook = XLSX.read(fs.readFileSync(workbookPath), { type: "buffer" });
  const sheet = workbook.Sheets.Export;
  if (!sheet) throw new Error("Brak arkusza Export w pliku struktury");
  const rows = XLSX.utils.sheet_to_json<StructureRow>(sheet, { defval: "" });
  const validRows = rows.filter((row) => {
    const storeCell = normalize(row.SKLEP || row["Oddzial adres"]);
    return Boolean(storeCell) && storeCell.toLowerCase() !== "total";
  });
  const expectedTotal = PARTNERS.reduce((sum, partner) => sum + partner.expectedStores, 0);
  if (validRows.length !== expectedTotal) throw new Error(`Nieprawidłowa liczba sklepów: ${validRows.length}, oczekiwano ${expectedTotal}`);

  const insertRegion = db.prepare("INSERT INTO partner_regions(code, partner_name) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET partner_name=excluded.partner_name");
  const getRegion = db.prepare("SELECT id FROM partner_regions WHERE code = ?");
  const upsertStore = db.prepare(`INSERT INTO stores(mpc, city, street, region_id) VALUES (?, ?, ?, ?)
    ON CONFLICT(mpc) DO UPDATE SET city=excluded.city, street=excluded.street, region_id=excluded.region_id`);

  for (const partner of PARTNERS) insertRegion.run(partner.code, partner.name);
  const seen = new Set<string>();
  const expectedCounts = new Map(PARTNERS.map((partner) => [partner.code, 0]));
  for (const row of validRows) {
    const parsed = parseStoreRow(row);
    const partnerCell = parsed.partnerCell;
    const partner = PARTNERS.find((item) => partnerCell.startsWith(item.code));
    if (!partner) throw new Error(`Nieznany partner w strukturze: ${partnerCell}`);
    const mpc = parsed.mpc;
    if (!/^D[A-Z0-9]+$/.test(mpc)) throw new Error(`Nieprawidłowy Store Code: ${mpc}`);
    if (seen.has(mpc)) throw new Error(`Duplikat Store Code w Excelu: ${mpc}`);
    seen.add(mpc);
    expectedCounts.set(partner.code, (expectedCounts.get(partner.code) || 0) + 1);
    const region = getRegion.get(partner.code) as { id: number };
    upsertStore.run(mpc, parsed.city, parsed.street, region.id);
  }

  for (const partner of PARTNERS) {
    const count = expectedCounts.get(partner.code) || 0;
    if (count !== partner.expectedStores) throw new Error(`Strefa ${partner.code}: ${count} sklepów, oczekiwano ${partner.expectedStores}`);
  }
}

function seedUsers(db: AppDatabase) {
  const passwordHash = hashSync(INITIAL_PASSWORD, 12);
  const insert = db.prepare(`INSERT INTO users(login, display_name, password_hash, role, region_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(login) DO NOTHING`);
  insert.run("manager", "Demo Manager", passwordHash, "MANAGER", null);
  db.prepare("UPDATE users SET display_name=? WHERE login=?").run("Demo Manager", "manager");
  for (const partner of PARTNERS) {
    const region = db.prepare("SELECT id FROM partner_regions WHERE code=?").get(partner.code) as { id: number };
    insert.run(partner.login, partner.name, passwordHash, "PARTNER", region.id);
  }
}

function migrateQuestionNumbering(db: AppDatabase) {
  const visits = db.prepare("SELECT DISTINCT visit_id FROM visit_answers ORDER BY visit_id").all() as { visit_id:string }[];
  const rowsForVisit = db.prepare("SELECT id,question_number FROM visit_answers WHERE visit_id=? ORDER BY id");
  const temporary = db.prepare("UPDATE visit_answers SET question_number=? WHERE id=?");
  const finalNumber = db.prepare("UPDATE visit_answers SET question_number=? WHERE id=?");
  for (const visit of visits) {
    const rows = rowsForVisit.all(visit.visit_id) as { id:number;question_number:number }[];
    if (rows.length !== 6 || rows.every((row,index)=>row.question_number===index+1)) continue;
    for (const row of rows) temporary.run(-row.id, row.id);
    rows.forEach((row,index)=>finalNumber.run(index+1,row.id));
  }
}

function recalculateWeightedVisitScores(db: AppDatabase) {
  const visits = db.prepare("SELECT id FROM visits WHERE status='COMPLETED'").all() as Array<{ id:string }>;
  const answersForVisit = db.prepare("SELECT question_number AS number,question_text AS text,answer FROM visit_answers WHERE visit_id=? ORDER BY question_number");
  const updateScore = db.prepare("UPDATE visits SET score=? WHERE id=?");
  for (const visit of visits) {
    const answers = (answersForVisit.all(visit.id) as Array<{ number:number;text:string;answer:number }>)
      .map(row => ({ ...row, answer: row.answer === 1 }));
    if (answers.length !== 6 && answers.length !== 10) continue;
    updateScore.run(calculateScoreForQuestions(answers), visit.id);
  }
}

export function initializeDatabase(db: AppDatabase) {
  fs.mkdirSync(path.dirname(databasePath()), { recursive: true });
  fs.mkdirSync(uploadDirectory(), { recursive: true });
  db.pragma("journal_mode = WAL");
  db.exec(schema);
  ensureVisitTypeColumn(db);
  db.transaction(() => {
    const currentStores = (db.prepare("SELECT COUNT(*) AS count FROM stores").get() as { count: number }).count;
    if (currentStores === 0) seedStructure(db);
    else if (currentStores < PARTNERS.reduce((sum, partner) => sum + partner.expectedStores, 0)) {
      seedStructure(db);
    }
    seedUsers(db);
    migrateQuestionNumbering(db);
    recalculateWeightedVisitScores(db);
  })();
  return db;
}

export function getDb() {
  if (!global.__retailVisitDb) {
    const db = new Database(databasePath());
    global.__retailVisitDb = initializeDatabase(db);
  }
  return global.__retailVisitDb;
}
