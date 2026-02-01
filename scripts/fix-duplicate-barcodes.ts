/**
 * แก้สินค้าเก่าที่บาร์โค้ดซ้ำ: ล้าง barcode ที่ซ้ำ → generate ใหม่ทีละสินค้า (จาก productId)
 * ห้ามใช้บาร์โค้ดเดิมต่อ
 *
 * วิธีใช้: pnpm exec tsx scripts/fix-duplicate-barcodes.ts
 */

import "../server/_core/env";
import { fixDuplicateBarcodes } from "../server/db";

async function main() {
  try {
    const { cleared, regenerated } = await fixDuplicateBarcodes();
    if (cleared === 0) {
      console.log("✅ ไม่พบบาร์โค้ดซ้ำ");
    } else {
      console.log(`✅ ล้างบาร์โค้ดซ้ำ ${cleared} รายการ, สร้างใหม่ ${regenerated} รายการ`);
    }
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ ไม่สำเร็จ:", msg);
    process.exit(1);
  }
}

main();
