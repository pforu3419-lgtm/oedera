/**
 * แก้ product id ซ้ำทั้งหมด (ทุก organization)
 * ทำให้สินค้าที่ใช้รหัสซ้ำกันได้ id ใหม่และ inventory แยก — สต็อกจะเพิ่ม/ลดถูกต้อง
 *
 * วิธีใช้: pnpm run fix-duplicate-product-ids
 */

import "../server/_core/env";
import { fixAllDuplicateProductIds } from "../server/db";

async function main() {
  try {
    console.log("🔍 กำลังตรวจสอบ product id ซ้ำ...");
    const { totalUpdated, byOrg } = await fixAllDuplicateProductIds();
    if (totalUpdated === 0) {
      console.log("✅ ไม่พบ product id ซ้ำ");
    } else {
      console.log(`✅ แก้ product id ซ้ำแล้ว ${totalUpdated} รายการ`);
      for (const [org, count] of Object.entries(byOrg)) {
        console.log(`   - ร้าน ${org}: ${count} รายการ`);
      }
    }
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ ไม่สำเร็จ:", msg);
    process.exit(1);
  }
}

main();
