import fs from "node:fs";
import path from "node:path";
import { getDb, uploadDirectory } from "@/lib/db";

const db = getDb();

db.transaction(() => {
  db.prepare("DELETE FROM visits").run();
  db.prepare("DELETE FROM sessions").run();
  db.prepare("DELETE FROM audit_log").run();
  db.prepare("DELETE FROM login_attempts").run();
})();

const uploads = uploadDirectory();
fs.mkdirSync(uploads, { recursive: true });
for (const entry of fs.readdirSync(uploads)) {
  fs.rmSync(path.join(uploads, entry), { recursive: true, force: true });
}

console.log("Operational data cleared. Accounts, passwords, regions and stores were preserved.");
