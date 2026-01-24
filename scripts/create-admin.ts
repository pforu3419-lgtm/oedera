/**
 * สคริปต์สร้างบัญชีผู้ดูแลระบบ (admin) ใหม่
 *
 * วิธีใช้:
 *   pnpm run create-admin -- --email admin2@example.com --password yourpassword --name "Admin 2"
 *
 * หรือใช้ตัวแปรแวดล้อม:
 *   ADMIN_EMAIL=admin2@example.com ADMIN_PASSWORD=xxx ADMIN_NAME="Admin 2" pnpm run create-admin
 */

import "../server/_core/env";
import { createInternalUser } from "../server/db";

function parseArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const email = parseArg("--email") ?? process.env.ADMIN_EMAIL;
  const password = parseArg("--password") ?? process.env.ADMIN_PASSWORD;
  const name = parseArg("--name") ?? process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.error("❌ ต้องระบุ --email และ --password");
    console.error("");
    console.error("ตัวอย่าง:");
    console.error('  pnpm run create-admin -- --email admin2@example.com --password รหัสผ่าน --name "Admin 2"');
    console.error("");
    console.error("หรือใช้ตัวแปรแวดล้อม ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME");
    process.exit(1);
  }

  try {
    const user = await createInternalUser({
      name: name || "Admin",
      email,
      password,
      role: "admin",
    });
    console.log("✅ สร้างแอดมินสำเร็จ:");
    console.log("   ID:", user.id);
    console.log("   อีเมล:", user.email);
    console.log("   ชื่อ:", user.name);
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ สร้างแอดมินไม่สำเร็จ:", msg);
    process.exit(1);
  }
}

main();
