import { hashSync } from "bcryptjs";
import { INITIAL_PASSWORD } from "@/lib/constants";
import { getDb } from "@/lib/db";

const db = getDb();
const passwordHash = hashSync(INITIAL_PASSWORD, 12);

const changed = db.transaction(() => {
  db.prepare("DELETE FROM sessions").run();
  return db.prepare(`UPDATE users
    SET password_hash=?, must_change_password=1, updated_at=datetime('now')`).run(passwordHash).changes;
})();

console.log(`Passwords reset for ${changed} accounts. All users must change the password after login.`);
