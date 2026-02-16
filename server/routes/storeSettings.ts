import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getMongoDb } from "../_core/mongo";
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_THEME_MODE,
  type StoreSettingsDoc,
  type ThemeMode,
} from "../models/StoreSettings";

const THEME_MODES = ["light", "dark"] as const;

function normalizeOptionalString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

let storeSettingsIndexEnsured = false;
async function ensureStoreSettingsIndex() {
  if (storeSettingsIndexEnsured) return;
  storeSettingsIndexEnsured = true;
  try {
    const db = await getMongoDb();
    const col = db.collection<StoreSettingsDoc>("storeSettings");
    await col.createIndex({ storeId: 1 }, { unique: true });
  } catch (err) {
    // ไม่ throw เพื่อไม่ให้ระบบเดิมล่ม ถ้า index สร้างไม่ได้
    console.warn("[storeSettings] Index creation failed:", err);
  }
}

async function getStoreSettingsByStoreId(storeId: number): Promise<StoreSettingsDoc | null> {
  await ensureStoreSettingsIndex();
  const db = await getMongoDb();
  const col = db.collection<StoreSettingsDoc>("storeSettings");
  return col.findOne({ storeId });
}

async function upsertStoreSettingsByStoreId(
  storeId: number,
  data: Partial<Omit<StoreSettingsDoc, "storeId" | "updatedAt">>
): Promise<StoreSettingsDoc> {
  await ensureStoreSettingsIndex();
  const db = await getMongoDb();
  const col = db.collection<StoreSettingsDoc>("storeSettings");
  const now = new Date();

  // เก็บเฉพาะฟิลด์ที่อนุญาต + normalize เป็น null เมื่อเป็น empty string
  const update: Partial<StoreSettingsDoc> = {
    updatedAt: now,
  };
  if (data.storeName !== undefined) update.storeName = String(data.storeName).trim();
  if (data.logoUrl !== undefined) update.logoUrl = normalizeOptionalString(data.logoUrl) as string | null;
  if (data.primaryColor !== undefined) update.primaryColor = String(data.primaryColor).trim();
  if (data.address !== undefined) update.address = normalizeOptionalString(data.address) as string | null;
  if (data.phone !== undefined) update.phone = normalizeOptionalString(data.phone) as string | null;
  if (data.themeMode !== undefined) update.themeMode = data.themeMode as ThemeMode;

  // หมายเหตุ: หลีกเลี่ยง MongoDB "Updating the path ... would create a conflict"
  // ด้วยการแยกเคส update vs insert (แทนการใช้ $set + $setOnInsert ที่ field ซ้ำกัน)
  const existing = await col.findOne({ storeId });
  if (existing) {
    await col.updateOne({ storeId }, { $set: update });
    return {
      ...existing,
      ...update,
      // คงค่าเดิมไว้ถ้าไม่ได้ส่งมา
      storeName: update.storeName ?? existing.storeName,
      logoUrl: update.logoUrl ?? existing.logoUrl ?? null,
      primaryColor: update.primaryColor ?? existing.primaryColor ?? DEFAULT_PRIMARY_COLOR,
      address: update.address ?? existing.address ?? null,
      phone: update.phone ?? existing.phone ?? null,
      themeMode: update.themeMode ?? existing.themeMode ?? DEFAULT_THEME_MODE,
      updatedAt: now,
    };
  }

  const doc: StoreSettingsDoc = {
    storeId,
    storeName: update.storeName ?? "Ordera",
    logoUrl: (update.logoUrl as string | null) ?? null,
    primaryColor: update.primaryColor ?? DEFAULT_PRIMARY_COLOR,
    address: (update.address as string | null) ?? null,
    phone: (update.phone as string | null) ?? null,
    themeMode: (update.themeMode as ThemeMode) ?? DEFAULT_THEME_MODE,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

const updateInputSchema = z.object({
  storeName: z.string().min(1, "กรุณากรอกชื่อร้าน").max(200).optional(),
  logoUrl: z.string().max(2000).optional(),
  primaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "รูปแบบสีต้องเป็น #RRGGBB")
    .optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  themeMode: z.enum(THEME_MODES).optional(),
});

/**
 * StoreSettings API (tRPC)
 * - get: ดึงตาม storeId ของผู้ใช้ปัจจุบัน
 * - update: อัปเดตตาม storeId ของผู้ใช้ปัจจุบัน (admin เท่านั้น)
 */
export const storeSettingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const storeId = ctx.user?.storeId ?? null;
    if (!storeId) return null;
    return getStoreSettingsByStoreId(Number(storeId));
  }),

  update: adminProcedure.input(updateInputSchema).mutation(async ({ input, ctx }) => {
    const storeId = ctx.user?.storeId ?? null;
    if (!storeId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "ไม่พบ storeId ของผู้ใช้ (กรุณาเชื่อมต่อร้านก่อน)",
      });
    }
    return upsertStoreSettingsByStoreId(Number(storeId), {
      storeName: input.storeName,
      logoUrl: input.logoUrl,
      primaryColor: input.primaryColor,
      address: input.address,
      phone: input.phone,
      themeMode: input.themeMode as ThemeMode | undefined,
    });
  }),
});

