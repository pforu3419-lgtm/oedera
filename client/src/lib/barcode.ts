/**
 * EAN-13: 13 หลัก ตัวเลขเท่านั้น + check digit ถูกต้อง
 */

/** คำนวณ check digit จาก 12 หลักแรก (EAN-13) */
export function ean13CheckDigit(digits12: string): number {
  if (digits12.length !== 12) return 0;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const w = (11 - i) % 2 === 0 ? 3 : 1;
    sum += parseInt(digits12[i], 10) * w;
  }
  return (10 - (sum % 10)) % 10;
}

/** ตรวจสอบว่าเป็น EAN-13 ที่ถูกต้อง (13 หลัก + check digit ถูก) */
export function validateEAN13(barcode: string): { valid: boolean; error?: string } {
  const raw = (barcode ?? "").trim();
  if (!raw) return { valid: false, error: "กรุณากรอกบาร์โค้ด" };
  if (!/^\d+$/.test(raw)) return { valid: false, error: "EAN-13 ต้องเป็นตัวเลขเท่านั้น" };
  if (raw.length !== 13) return { valid: false, error: "EAN-13 ต้องเป็นตัวเลข 13 หลัก" };
  const base = raw.slice(0, 12);
  const expectedCheck = ean13CheckDigit(base);
  const actualCheck = parseInt(raw[12], 10);
  if (expectedCheck !== actualCheck) {
    return { valid: false, error: "EAN-13 ต้องเป็นตัวเลข 13 หลัก และมี check digit ที่ถูกต้อง" };
  }
  return { valid: true };
}

/** กรอก 12 หลัก → คืนค่า 13 หลัก (ต่อ check digit ให้) */
export function appendEAN13CheckDigit(digits12: string): string {
  const digits = digits12.replace(/\D/g, "").slice(0, 12);
  if (digits.length !== 12) return digits12.replace(/\D/g, "").slice(0, 13);
  const check = ean13CheckDigit(digits);
  return digits + String(check);
}

/** ปรับค่าที่ผู้ใช้พิมพ์: เฉพาะตัวเลข สูงสุด 13 หลัก; ถ้า 12 หลักให้ต่อ check digit */
export function normalizeEAN13Input(raw: string, autoAppendCheckDigit: boolean): string {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  if (autoAppendCheckDigit && digits.length === 12) return appendEAN13CheckDigit(digits);
  return digits;
}
