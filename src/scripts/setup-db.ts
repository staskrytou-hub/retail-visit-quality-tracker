import { getDb, databasePath, uploadDirectory } from "@/lib/db";

const db = getDb();
const stores = (db.prepare("SELECT COUNT(*) AS count FROM stores").get() as { count: number }).count;
const users = (db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number }).count;
const regions = (db.prepare("SELECT COUNT(*) AS count FROM partner_regions").get() as { count: number }).count;
console.log(JSON.stringify({ database: databasePath(), uploads: uploadDirectory(), regions, users, stores }, null, 2));
