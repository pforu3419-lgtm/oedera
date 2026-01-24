/**
 * สคริปต์สร้างรหัสแอดมิน (Admin Code) สำหรับลูกค้าที่ซื้อระบบจาก Ordera
 * 1 รหัส = 1 ร้าน ใช้ได้ครั้งเดียว
 *
 * วิธีใช้: pnpm run create-admin-code
 */

import "../server/_core/env";
import { createAdminCode } from "../server/db";

async function main() {
  try {
    const ac = await createAdminCode();
    console.log("✅ สร้างรหัสแอดมินสำเร็จ:");
    console.log("");
    console.log("   รหัส:", ac.code);
    console.log("");
    console.log("   มอบรหัสนี้ให้ลูกค้านำไปกรอกในหน้า \"เข้าร้านด้วยรหัสแอดมิน\"");
    console.log("   เมื่อกรอกถูกต้อง ระบบจะสร้างร้านให้และลูกค้าจะเป็น Admin ประจำร้าน");
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ สร้างรหัสแอดมินไม่สำเร็จ:", msg);
    process.exit(1);
  }
}

main();
