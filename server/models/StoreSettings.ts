export const DEFAULT_PRIMARY_COLOR = "#f97316" as const;
export const DEFAULT_THEME_MODE = "light" as const;

export type ThemeMode = "light" | "dark";

/**
 * StoreSettings: ตั้งค่าร้าน (ต่อ storeId)
 * - ออกแบบให้เป็นโมดูลใหม่ ไม่ไปกระทบ logic POS เดิม
 * - ทุก query ต้อง filter ด้วย storeId เพื่อรองรับ multi-tenant
 */
export type StoreSettingsDoc = {
  storeId: number;
  storeName: string;
  logoUrl: string | null;
  primaryColor: string; // default: #f97316
  address: string | null;
  phone: string | null;
  themeMode: ThemeMode;
  updatedAt: Date;
};

