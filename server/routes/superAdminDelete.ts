import { TRPCError } from "@trpc/server";
import { getMongoDb } from "../_core/mongo";
import type { StoreDoc } from "../db";

export async function deleteStoreAndOrgDataByStoreCode(storeCode: string) {
  const code = storeCode.trim();
  if (!code) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "storeCode ต้องไม่ว่าง" });
  }

  const db = await getMongoDb();
  const stores = db.collection<StoreDoc>("stores");
  const store = await stores.findOne({ storeCode: code });
  if (!store) {
    throw new TRPCError({ code: "NOT_FOUND", message: `ไม่พบร้านจากโค้ด: ${code}` });
  }

  const ownerId = Number((store as any).ownerId);
  if (!Number.isFinite(ownerId) || ownerId <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "ownerId ของร้านไม่ถูกต้อง" });
  }

  // Delete the specific store (by storeCode; safe even if store.id duplicates)
  const storeDelete = await stores.deleteOne({ storeCode: code });

  // Best-effort cleanup of records tied by storeId (may be ambiguous if store.id duplicates in bad data)
  const storeId = Number((store as any).id);
  const storeSettings = db.collection<any>("storeSettings");
  const storeInvites = db.collection<any>("storeInvites");

  const storeSettingsDelete = Number.isFinite(storeId)
    ? await storeSettings.deleteMany({ storeId })
    : { deletedCount: 0 };

  // storeInvites doesn't have storeCode; limit by storeId + createdBy within org user ids
  const users = db.collection<any>("users");
  const orgUsers = await users
    .find({
      $or: [{ organizationId: ownerId }, { id: ownerId, organizationId: null }],
    })
    .project({ id: 1 })
    .toArray();
  const orgUserIds = orgUsers.map((u: any) => Number(u.id)).filter((n) => Number.isFinite(n));

  const storeInvitesDelete = Number.isFinite(storeId)
    ? await storeInvites.deleteMany({ storeId, createdBy: { $in: orgUserIds } })
    : { deletedCount: 0 };

  // Delete org-scoped data (everything that uses organizationId)
  const orgFilter = { organizationId: ownerId } as const;
  const collections = [
    "categories",
    "products",
    "inventory",
    "stockMovements",
    "customers",
    "transactions",
    "transactionItems",
    "discounts",
    "discountCodes",
    "loyaltyTransactions",
    "loyaltySettings",
    "receiptTemplates",
    "activityLogs",
    "companyProfiles",
    "taxInvoices",
    "vatReports",
    "withholdingTaxes",
    "annualIncomeSummaries",
    "purchaseInvoices",
    "toppings",
  ];

  const orgDeletes: Record<string, number> = {};
  for (const name of collections) {
    try {
      const res = await db.collection(name).deleteMany(orgFilter);
      orgDeletes[name] = res.deletedCount ?? 0;
    } catch (e) {
      // ignore missing collections
      orgDeletes[name] = orgDeletes[name] ?? 0;
    }
  }

  // Delete users in org (owner + staff)
  const userDelete = await users.deleteMany({
    $or: [{ organizationId: ownerId }, { id: ownerId, organizationId: null }],
  });

  return {
    ok: true,
    storeCode: code,
    ownerId,
    deleted: {
      stores: storeDelete.deletedCount ?? 0,
      storeSettings: (storeSettingsDelete as any).deletedCount ?? 0,
      storeInvites: (storeInvitesDelete as any).deletedCount ?? 0,
      users: userDelete.deletedCount ?? 0,
      org: orgDeletes,
    },
  } as const;
}

