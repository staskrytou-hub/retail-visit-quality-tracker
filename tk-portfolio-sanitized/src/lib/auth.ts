import { compare, hash } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { INITIAL_PASSWORD, SESSION_COOKIE } from "@/lib/constants";
import { getDb } from "@/lib/db";

export type SessionUser = {
  id: number;
  login: string;
  displayName: string;
  role: "MANAGER" | "PARTNER";
  regionId: number | null;
  regionCode: string | null;
  mustChangePassword: boolean;
};

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export function audit(userId: number | null, event: string, entityType?: string, entityId?: string) {
  getDb().prepare("INSERT INTO audit_log(user_id,event,entity_type,entity_id) VALUES (?,?,?,?)").run(userId, event, entityType ?? null, entityId ?? null);
}

export function readUserFromRequest(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = getDb().prepare(`SELECT u.id,u.login,u.display_name,u.role,u.region_id,u.must_change_password,r.code AS region_code
    FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN partner_regions r ON r.id=u.region_id
    WHERE s.token_hash=? AND s.expires_at > datetime('now')`).get(tokenHash(token)) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: Number(row.id), login: String(row.login), displayName: String(row.display_name),
    role: row.role as SessionUser["role"], regionId: row.region_id === null ? null : Number(row.region_id),
    regionCode: row.region_code ? String(row.region_code) : null, mustChangePassword: Boolean(row.must_change_password),
  };
}

export function requireUser(request: NextRequest, options?: { role?: SessionUser["role"]; allowPasswordChange?: boolean }) {
  const user = readUserFromRequest(request);
  if (!user) throw new Response("Brak autoryzacji", { status: 401 });
  if (user.mustChangePassword && !options?.allowPasswordChange) throw new Response("Wymagana zmiana hasła", { status: 428 });
  if (options?.role && user.role !== options.role) throw new Response("Brak uprawnień", { status: 403 });
  return user;
}

export async function verifyCredentials(login: string, password: string) {
  const row = getDb().prepare("SELECT id,password_hash FROM users WHERE login=?").get(login) as { id: number; password_hash: string } | undefined;
  if (!row || !(await compare(password, row.password_hash))) return null;
  return row.id;
}

export function createSession(userId: number, response: NextResponse, request?: NextRequest) {
  const token = randomBytes(32).toString("base64url");
  const days = Math.max(1, Number(process.env.SESSION_DAYS || 14));
  const expires = new Date(Date.now() + days * 86400000);
  getDb().prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)").run(tokenHash(token), userId, expires.toISOString());
  const forwardedProtocol = request?.headers.get("x-forwarded-proto")?.split(",")[0];
  const secure = forwardedProtocol === "https" || request?.nextUrl.protocol === "https:";
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "strict", secure, path: "/", expires, priority: "high",
  });
}

export function destroySession(request: NextRequest, response: NextResponse) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash(token));
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
}

export async function changePassword(userId: number, current: string, next: string) {
  const row = getDb().prepare("SELECT password_hash FROM users WHERE id=?").get(userId) as { password_hash: string };
  if (!(await compare(current, row.password_hash))) return false;
  const nextHash = await hash(next, 12);
  getDb().transaction(() => {
    getDb().prepare("UPDATE users SET password_hash=?,must_change_password=0,updated_at=datetime('now') WHERE id=?").run(nextHash, userId);
    getDb().prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
    audit(userId, "password_changed", "user", String(userId));
  })();
  return true;
}

function normalizeResetRegion(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/^(region|reg)/, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export async function resetPasswordWithConfirmation(regionOrLogin: string, confirmationRegion: string) {
  const input = regionOrLogin.trim();
  const row = getDb().prepare(`SELECT u.id,u.login,u.display_name AS displayName,r.code AS regionCode
    FROM users u LEFT JOIN partner_regions r ON r.id=u.region_id
    WHERE LOWER(u.login)=LOWER(?) OR LOWER(r.code)=LOWER(?)`)
    .get(input, input) as { id:number; login:string; displayName:string; regionCode:string|null } | undefined;
  if (!row?.regionCode) return false;

  const requested = normalizeResetRegion(regionOrLogin);
  const confirmed = normalizeResetRegion(confirmationRegion);
  const actual = normalizeResetRegion(row.regionCode);
  if (!requested || requested !== confirmed || requested !== actual) return false;

  const nextHash = await hash(INITIAL_PASSWORD, 12);
  getDb().transaction(() => {
    getDb().prepare("UPDATE users SET password_hash=?,must_change_password=1,updated_at=datetime('now') WHERE id=?").run(nextHash, row.id);
    getDb().prepare("DELETE FROM sessions WHERE user_id=?").run(row.id);
    audit(row.id, "password_reset_self_service", "user", String(row.id));
  })();
  return true;
}
