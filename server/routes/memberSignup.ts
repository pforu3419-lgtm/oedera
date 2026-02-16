import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getMongoDb } from "../_core/mongo";
import { publicProcedure, router } from "../_core/trpc";
import { createCustomer } from "../db";

type StorePublicInfo = {
  storeId: number;
  storeName: string;
  logoUrl: string | null;
  primaryColor: string | null;
};

type MemberCustomerDoc = {
  storeId: number;
  name: string;
  phone: string;
  createdAt: Date;
};

let ensuredIndex = false;
async function ensureMemberCustomersIndex() {
  if (ensuredIndex) return;
  ensuredIndex = true;
  try {
    const db = await getMongoDb();
    const col = db.collection<MemberCustomerDoc>("memberCustomers");
    await col.createIndex({ storeId: 1, phone: 1 }, { unique: true });
    await col.createIndex({ storeId: 1, createdAt: -1 });
  } catch (e) {
    // ignore index errors (still enforce in app-level by duplicate key handling)
    ensuredIndex = false;
  }
}

function normalizePhone(v: string) {
  return v.replace(/\s+/g, "").trim();
}

export const memberSignupRouter = router({
  storeInfo: publicProcedure
    .input(z.object({ storeId: z.number().int().positive(), orgId: z.number().int().positive().optional() }))
    .query(async ({ input }): Promise<StorePublicInfo> => {
      await ensureMemberCustomersIndex();
      const db = await getMongoDb();
      const stores = db.collection<any>("stores");
      const storeSettings = db.collection<any>("storeSettings");

      // store id อาจซ้ำในข้อมูลเก่า → ถ้ามี orgId ให้จับคู่ด้วย ownerId เพื่อชี้ร้านให้ถูก
      const storeRows = await stores
        .find(input.orgId ? { id: input.storeId, ownerId: input.orgId } : { id: input.storeId })
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .limit(1)
        .toArray();
      const store = storeRows[0];
      if (!store) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบร้านนี้" });
      }

      const ss = await storeSettings.findOne({ storeId: input.storeId });
      const storeName = String((ss?.storeName ?? store?.name ?? "") || "").trim() || "ร้านค้า";
      const logoUrl = (ss?.logoUrl != null && String(ss.logoUrl).trim() !== "") ? String(ss.logoUrl).trim() : null;
      const primaryColor =
        ss?.primaryColor != null && String(ss.primaryColor).trim() !== "" ? String(ss.primaryColor).trim() : null;

      return { storeId: input.storeId, storeName, logoUrl, primaryColor };
    }),

  register: publicProcedure
    .input(
      z.object({
        storeId: z.number().int().positive(),
        orgId: z.number().int().positive().optional(),
        name: z.string().min(1, "กรุณากรอกชื่อ").max(200),
        phone: z.string().min(6, "กรุณากรอกเบอร์โทร").max(50),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureMemberCustomersIndex();
      const db = await getMongoDb();
      const stores = db.collection<any>("stores");
      const memberCustomers = db.collection<MemberCustomerDoc>("memberCustomers");

      // ensure store exists (id may be duplicated; allow signup as long as any exists)
      const exists = await stores
        .find(input.orgId ? { id: input.storeId, ownerId: input.orgId } : { id: input.storeId })
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .limit(1)
        .toArray()
        .then((rows) => rows[0]);
      if (!exists) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบร้านนี้" });
      }

      const normalizedPhone = normalizePhone(input.phone);
      const doc: MemberCustomerDoc = {
        storeId: input.storeId,
        name: input.name.trim(),
        phone: normalizedPhone,
        createdAt: new Date(),
      };

      try {
        await memberCustomers.insertOne(doc);
      } catch (e: any) {
        const msg = String(e?.message ?? "");
        // Duplicate key error
        if (msg.includes("E11000") || msg.toLowerCase().includes("duplicate")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "เบอร์โทรนี้สมัครแล้ว",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "สมัครไม่สำเร็จ กรุณาลองใหม่",
        });
      }

      // Sync into existing "customers" collection so it shows in the POS customer list (organization-scoped).
      // This keeps member signups visible without changing existing customer UI/flows.
      try {
        const ownerId = input.orgId != null
          ? Number(input.orgId)
          : Number((exists as any)?.ownerId ?? (exists as any)?.organizationId ?? (exists as any)?.orgId ?? NaN);
        if (Number.isFinite(ownerId) && ownerId > 0) {
          const customers = db.collection<any>("customers");
          const variants = Array.from(
            new Set([String(input.phone || "").trim(), normalizedPhone].filter(Boolean)),
          );
          const existingCustomer = await customers.findOne({
            organizationId: ownerId,
            phone: variants.length > 1 ? { $in: variants } : variants[0],
          });

          if (existingCustomer) {
            await customers.updateOne(
              { _id: existingCustomer._id },
              {
                $set: {
                  name: String(input.name || "").trim() || existingCustomer.name,
                  phone: normalizedPhone || existingCustomer.phone,
                  updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
              },
            );
            // best-effort: add a note if none exists
            if (!existingCustomer.notes) {
              await customers.updateOne(
                { _id: existingCustomer._id, notes: { $in: [null, ""] } },
                { $set: { notes: "สมัครผ่าน QR", updatedAt: new Date() } },
              );
            }
          } else {
            await createCustomer({
              name: input.name.trim(),
              phone: normalizedPhone,
              notes: "สมัครผ่าน QR",
              organizationId: ownerId,
            });
          }
        }
      } catch {
        // ignore sync errors; membership record is the source of truth
      }

      return { success: true } as const;
    }),
});

