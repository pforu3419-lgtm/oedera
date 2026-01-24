/**
 * ตั้งรหัสหลักสำหรับเข้าหน้าสร้างรหัสแอดมิน (เก็บใน DB)
 *
 * วิธีใช้: pnpm exec tsx scripts/set-master-code.ts <รหัส>
 * ตัวอย่าง: pnpm exec tsx scripts/set-master-code.ts prawit0826958692tee
 */

import "../server/_core/env";
import { setMasterCodeForAdminCodes } from "../server/db";

async function main() {
  const code = process.argv[2]?.trim();
  if (!code || code.length < 8) {
    console.error("ใช้: pnpm exec tsx scripts/set-master-code.ts <รหัส>");
    console.error("รหัสต้องมีอย่างน้อย 8 ตัวอักษร");
    process.exit(1);
  }
  try {
    await setMasterCodeForAdminCodes(code);
    console.log("✅ ตั้งรหัสหลักสำหรับหน้าสร้างรหัสแอดมินเรียบร้อย");
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ ไม่สำเร็จ:", msg);
    process.exit(1);
  }
}

main();
