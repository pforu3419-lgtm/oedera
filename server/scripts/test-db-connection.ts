/**
 * ทดสอบการเชื่อมต่อ MongoDB (โหลด env จาก env.runtime / .env)
 * รัน: pnpm tsx server/scripts/test-db-connection.ts
 */
import "../_core/env";
import { getMongoDb } from "../_core/mongo";

async function main() {
  try {
    const db = await getMongoDb();
    const name = db.databaseName;
    await db.command({ ping: 1 });
    console.log("[OK] MongoDB connected. Database:", name);
    process.exit(0);
  } catch (err) {
    console.error("[FAIL]", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
