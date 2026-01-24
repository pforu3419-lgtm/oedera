/**
 * แก้หมวดหมู่ที่ id ซ้ำใน org เดียวกัน (ถ้าเลือก "2" บันทึกแล้วขึ้น "1" ให้รันสคริปต์นี้)
 *
 * วิธีใช้: pnpm exec tsx scripts/fix-duplicate-category-ids.ts
 */

import "../server/_core/env";
import { fixDuplicateCategoryIds } from "../server/db";

async function main() {
  try {
    const { updated } = await fixDuplicateCategoryIds();
    if (updated === 0) {
      console.log("✅ ไม่พบหมวดหมู่ที่ id ซ้ำ");
    } else {
      console.log(`✅ แก้ไขหมวดหมู่ที่ซ้ำแล้ว ${updated} รายการ`);
    }
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ ไม่สำเร็จ:", msg);
    process.exit(1);
  }
}

main();
