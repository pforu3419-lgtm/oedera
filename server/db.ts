import { getMongoDb } from "./_core/mongo";
import { ENV } from "./_core/env";
import { hashPassword, verifyPassword } from "./_core/passwords";
import { nanoid } from "nanoid";

type Role = "admin" | "manager" | "cashier" | "user";

// ============ ADMIN CODES (รหัสแอดมิน) ============
// 1 รหัส = 1 ร้าน ใช้ได้ครั้งเดียว เมื่อลูกค้าซื้อระบบจาก Ordera จะได้รหัสไปกรอกเพื่อสร้างร้านและเป็น Admin
export type AdminCodeDoc = {
  id: number;
  code: string;
  used: boolean;
  usedAt: Date | null;
  usedBy: number | null;
  storeId: number | null;
  createdAt: Date;
};

export async function createAdminCode(): Promise<AdminCodeDoc> {
  const col = await getCollection<AdminCodeDoc>("adminCodes");
  const id = await getNextSeq("adminCodes");
  const code = "ORDERA-" + nanoid(10).toUpperCase().replace(/-/g, "");
  const now = new Date();
  const existing = await col.findOne({ code });
  if (existing) return createAdminCode(); // retry if collision
  const doc: AdminCodeDoc = {
    id,
    code,
    used: false,
    usedAt: null,
    usedBy: null,
    storeId: null,
    createdAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

export async function getAdminCodeByCode(code: string): Promise<AdminCodeDoc | null> {
  const col = await getCollection<AdminCodeDoc>("adminCodes");
  return col.findOne({ code: code.trim().toUpperCase() });
}

export async function redeemAdminCode(code: string, userId: number): Promise<{ store: StoreDoc }> {
  const col = await getCollection<AdminCodeDoc>("adminCodes");
  const users = await getCollection<UserDoc>("users");
  const ac = await getAdminCodeByCode(code);
  if (!ac) throw new Error("รหัสแอดมินไม่ถูกต้อง");
  if (ac.used) throw new Error("รหัสแอดมินถูกใช้งานแล้ว");

  const user = await users.findOne({ id: userId });
  if (!user) throw new Error("ไม่พบผู้ใช้");

  const store = await createStore({
    storeCode: "STORE-" + Date.now(),
    name: `ร้านของ ${user.name || "ฉัน"}`,
    ownerId: userId,
  });

  const now = new Date();
  await col.updateOne(
    { id: ac.id },
    { $set: { used: true, usedAt: now, usedBy: userId, storeId: store.id } }
  );
  await users.updateOne(
    { id: userId },
    { $set: { storeId: store.id, role: "admin", organizationId: null, updatedAt: now } }
  );

  return { store };
}

export type UserDoc = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  loginMethod: string | null;
  passwordHash: string | null;
  passwordSalt: string | null;
  role: Role;
  organizationId: number | null; // null = organization ของตัวเอง (owner)
  storeId: number | null; // เพิ่ม storeId สำหรับระบบห้องร้าน (null = ยังไม่อยู่ร้านไหน)
  createdBy: number | null; // null = สร้างเอง, number = user id ที่สร้าง
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

async function getCollection<T extends Record<string, unknown>>(name: string) {
  const db = await getMongoDb();
  return db.collection<T>(name);
}

async function getNextSeq(name: string) {
  const counters = await getCollection<{ _id: string; seq: number }>("counters");
  console.log(`[getNextSeq] Getting next sequence for: ${name}`);
  const result = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const nextSeq = result.value?.seq ?? 1;
  console.log(`[getNextSeq] Next sequence for ${name}: ${nextSeq}`);
  return nextSeq;
}

// Get next sequence for a specific organization (for multi-tenant isolation)
async function getNextSeqForOrg(name: string, organizationId: number) {
  const counters = await getCollection<{ _id: string; seq: number }>("counters");
  const counterKey = `${name}_org_${organizationId}`;
  console.log(`[getNextSeqForOrg] Getting next sequence for: ${counterKey}`);
  const result = await counters.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const nextSeq = result.value?.seq ?? 1;
  console.log(`[getNextSeqForOrg] Next sequence for ${counterKey}: ${nextSeq}`);
  return nextSeq;
}

// Export getNextSeq for use in routers
export { getNextSeq, getNextSeqForOrg };

// ============ USERS ============
// Helper: Get organizationId for a user
// ถ้า organizationId = null หมายความว่า user เป็น owner ใช้ user.id เป็น organizationId
export function getUserOrganizationId(user: { id: number; organizationId?: number | null } | null): number | null {
  if (!user) return null;
  return user.organizationId ?? user.id;
}

export async function upsertUser(user: {
  openId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  loginMethod?: string | null;
  role?: Role;
  lastSignedIn?: Date;
  passwordHash?: string | null;
  passwordSalt?: string | null;
}) {
  const users = await getCollection<UserDoc>("users");
  const existing = await users.findOne({ openId: user.openId });
  const now = new Date();
  if (!existing) {
    const role =
      user.role ??
      (user.openId === ENV.ownerOpenId ? "admin" : "cashier");
    await users.insertOne({
      id: await getNextSeq("users"),
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      loginMethod: user.loginMethod ?? null,
      passwordHash: user.passwordHash ?? null,
      passwordSalt: user.passwordSalt ?? null,
      role,
      organizationId: null,
      createdBy: null,
      storeId: null,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? now,
    } as UserDoc);
    return;
  }

  const update: Partial<UserDoc> = {
    updatedAt: now,
  };
  if (user.name !== undefined) update.name = user.name ?? null;
  if (user.email !== undefined) update.email = user.email ?? null;
  if (user.phone !== undefined) update.phone = user.phone ?? null;
  if (user.loginMethod !== undefined) update.loginMethod = user.loginMethod ?? null;
  if (user.passwordHash !== undefined) update.passwordHash = user.passwordHash ?? null;
  if (user.passwordSalt !== undefined) update.passwordSalt = user.passwordSalt ?? null;
  if (user.role !== undefined) update.role = user.role;
  if (user.openId === ENV.ownerOpenId) update.role = "admin";
  if (user.lastSignedIn !== undefined) update.lastSignedIn = user.lastSignedIn;
  await users.updateOne({ openId: user.openId }, { $set: update });
}

export async function getUserByOpenId(openId: string) {
  const users = await getCollection<UserDoc>("users");
  return users.findOne({ openId });
    }

export async function getUserByEmail(email: string) {
  const users = await getCollection<UserDoc>("users");
  const emailLower = email.toLowerCase();
  console.log("[getUserByEmail] Searching for email:", emailLower);
  const result = await users.findOne({ email: emailLower });
  if (result) {
    console.log("[getUserByEmail] Found user:", { id: result.id, email: result.email, name: result.name });
  } else {
    console.log("[getUserByEmail] No user found with email:", emailLower);
  }
  return result;
}

export async function getUserByInviteCode(inviteCode: string) {
  const users = await getCollection<UserDoc>("users");
  // inviteCode จะเป็น format: INVITE-{userId}-{timestamp}
  const parts = inviteCode.split("-");
  if (parts.length >= 2 && parts[0] === "INVITE") {
    const userId = parseInt(parts[1]);
    if (!isNaN(userId)) {
      const user = await users.findOne({ id: userId });
      // ตรวจสอบว่า user เป็น manager/admin และมี organizationId
      if (user && (user.role === "manager" || user.role === "admin")) {
        return user;
      }
    }
  }
  return null;
}

export async function getUserCount(): Promise<number> {
  const users = await getCollection<UserDoc>("users");
  return users.countDocuments({});
}

export async function getAdminCount(): Promise<number> {
  const users = await getCollection<UserDoc>("users");
  return users.countDocuments({ role: "admin" });
}

// Helper to get collection (exported for use in routers)
export async function getCollectionAsync<T extends Record<string, unknown>>(name: string) {
  const db = await getMongoDb();
  return db.collection<T>(name);
}

export async function createInternalUser(data: {
  name: string;
  email: string;
  password: string;
  role?: Role;
  organizationId?: number | null;
  createdBy?: number | null;
  storeId?: number | null;
}) {
  try {
    console.log("[createInternalUser] Starting user creation...");
    const users = await getCollection<UserDoc>("users");
    console.log("[createInternalUser] Collection obtained");
    
    const emailLower = data.email.toLowerCase();
    
    // ✅ ตรวจสอบ email ก่อนทุกอย่าง (สำคัญมาก!)
    console.log("[createInternalUser] Checking if email exists:", emailLower);
    const existing = await users.findOne({ email: emailLower });
    if (existing) {
      console.log("[createInternalUser] ❌ Email already exists:", { 
        existingId: existing.id, 
        existingEmail: existing.email,
        existingName: existing.name,
        newEmail: emailLower 
      });
      throw new Error(`Email ${emailLower} is already registered`);
    }
    console.log("[createInternalUser] ✅ Email is available");
    
    const now = new Date();
    const { hash, salt } = hashPassword(data.password);
    console.log("[createInternalUser] Password hashed");
    
    const role = data.role ?? "manager";
    let userId = await getNextSeq("users");
    console.log("[createInternalUser] Generated user ID:", userId);
    
    // Double check that this ID doesn't already exist (safety check)
    const existingById = await users.findOne({ id: userId });
    if (existingById) {
      console.warn(`[createInternalUser] ⚠️ User ID ${userId} already exists! Getting max ID...`);
      // Get the max ID and use that + 1
      const maxUser = await users.find({}).sort({ id: -1 }).limit(1).toArray();
      const maxId = maxUser.length > 0 ? maxUser[0].id : 0;
      userId = maxId + 1;
      console.log(`[createInternalUser] Using manual ID: ${userId} (max was ${maxId})`);
      // Update counter to match
      const counters = await getCollection<{ _id: string; seq: number }>("counters");
      await counters.updateOne(
        { _id: "users" },
        { $set: { seq: userId } },
        { upsert: true }
      );
    }
    
    const doc: UserDoc = {
      id: userId,
      openId: `local_${Date.now()}_${userId}`,
      name: data.name || null,
      email: emailLower,
      phone: null,
      loginMethod: "internal",
      passwordHash: hash,
      passwordSalt: salt,
      role,
      organizationId: data.organizationId ?? null,
      createdBy: data.createdBy ?? null,
      storeId: data.storeId ?? null,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
    console.log("[createInternalUser] Document prepared:", { id: doc.id, email: doc.email, name: doc.name });
    console.log("[createInternalUser] Attempting to insert into MongoDB...");
    
    const result = await users.insertOne(doc);
    console.log("[createInternalUser] Insert result:", {
      insertedId: result.insertedId,
      acknowledged: result.acknowledged
    });
    
    if (!result.insertedId) {
      console.error("[createInternalUser] ❌ Insert failed - no insertedId returned");
      throw new Error("Failed to insert user into database - no insertedId");
    }
    
    if (!result.acknowledged) {
      console.error("[createInternalUser] ❌ Insert not acknowledged by MongoDB");
      throw new Error("Failed to insert user into database - not acknowledged");
    }
    
    // Verify the user was actually inserted
    const verifyUser = await users.findOne({ id: userId });
    if (!verifyUser) {
      console.error("[createInternalUser] ❌ User not found after insert");
      throw new Error("Failed to verify user insertion");
    }
    
    console.log("[createInternalUser] ✅ User successfully created and verified:", {
      id: verifyUser.id,
      email: verifyUser.email,
      name: verifyUser.name
    });
    
    return doc;
  } catch (error) {
    console.error("[createInternalUser] ❌ Error creating user:", error);
    console.error("[createInternalUser] Error stack:", error instanceof Error ? error.stack : "No stack");
    if (error instanceof Error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
    throw error;
  }
}

export function verifyUserPassword(
  user: { passwordHash?: string | null; passwordSalt?: string | null },
  password: string
) {
  if (!user.passwordHash || !user.passwordSalt) return false;
  return verifyPassword(password, user.passwordSalt, user.passwordHash);
    }

export async function updateUserPasswordByEmail(email: string, password: string) {
  const users = await getCollection<UserDoc>("users");
  const { hash, salt } = hashPassword(password);
  const result = await users.updateOne(
    { email: email.toLowerCase() },
    { $set: { passwordHash: hash, passwordSalt: salt, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
    }

export async function updateUserRoleByEmail(email: string, role: Role) {
  const users = await getCollection<UserDoc>("users");
  const result = await users.updateOne(
    { email: email.toLowerCase() },
    { $set: { role, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

export async function getUsers(organizationId?: number | null) {
  const users = await getCollection<UserDoc>("users");
  const query: any = {};
  // Filter by organizationId: ถ้า organizationId = null หมายความว่า user เป็น owner ใช้ user.id เป็น organizationId
  // ถ้า organizationId != null หมายความว่า user เป็นสมาชิกของ organization นั้น
  if (organizationId !== undefined && organizationId !== null) {
    query.$or = [
      { organizationId: organizationId }, // สมาชิกของ organization
      { id: organizationId, organizationId: null }, // owner ของ organization
    ];
  }
  const results = await users.find(query).sort({ createdAt: 1 }).toArray();
  return results.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  }));
}

export async function getUserById(id: number, organizationId?: number | null) {
  const users = await getCollection<UserDoc>("users");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.$or = [
      { organizationId: organizationId },
      { id: organizationId, organizationId: null },
    ];
  }
  return users.findOne(query);
}

export async function createUser(
  data: {
    name: string;
    email: string;
    phone?: string;
    role: "admin" | "manager" | "cashier";
    password: string;
  },
  organizationId: number,
  createdBy: number,
  storeId: number
) {
  return createInternalUser({
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role,
    organizationId,
    createdBy,
    storeId,
  });
}

export async function updateUser(
  id: number,
  data: Partial<{ name: string; email: string; phone: string; role: Role }>,
  organizationId?: number | null
) {
  const users = await getCollection<UserDoc>("users");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.$or = [
      { organizationId: organizationId },
      { id: organizationId, organizationId: null },
    ];
  }
  const update: Partial<UserDoc> = { updatedAt: new Date() };
  if (data.name !== undefined) update.name = data.name ?? null;
  if (data.email !== undefined) update.email = data.email ?? null;
  if (data.phone !== undefined) update.phone = data.phone ?? null;
  if (data.role !== undefined) update.role = data.role;
  await users.updateOne(query, { $set: update });
}

export async function deleteUser(id: number, organizationId?: number | null) {
  const users = await getCollection<UserDoc>("users");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.$or = [
      { organizationId: organizationId },
      { id: organizationId, organizationId: null },
    ];
  }
  await users.deleteOne(query);
}

// ============ CATEGORIES ============
export async function getCategories(organizationId?: number | null) {
  const categories = await getCollection<any>("categories");
  const query: any = { isActive: true };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return categories.find(query).sort({ displayOrder: 1 }).toArray();
}

export async function getCategoryById(id: number, organizationId?: number | null) {
  const categories = await getCollection<any>("categories");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return categories.findOne(query);
}

export async function createCategory(data: {
  name: string;
  description?: string;
  displayOrder?: number;
  organizationId: number;
}) {
  const categories = await getCollection<any>("categories");
  const now = new Date();
  const doc = {
    id: await getNextSeq("categories"),
    name: data.name,
    description: data.description ?? null,
    displayOrder: data.displayOrder ?? 0,
    isActive: true,
    organizationId: data.organizationId,
    createdAt: now,
    updatedAt: now,
  };
  await categories.insertOne(doc);
  return doc;
}

export async function updateCategory(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
  }>,
  organizationId?: number | null
) {
  const categories = await getCollection<any>("categories");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  await categories.updateOne(query, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteCategory(id: number, organizationId?: number | null) {
  const categories = await getCollection<any>("categories");
  const products = await getCollection<any>("products");
  const productQuery: any = { categoryId: id };
  if (organizationId !== undefined && organizationId !== null) {
    productQuery.organizationId = organizationId;
  }
  const count = await products.countDocuments(productQuery);
  if (count > 0) {
    throw new Error("ไม่สามารถลบได้ เนื่องจากมีสินค้าในหมวดหมู่นี้");
  }
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  await categories.deleteOne(query);
}

/**
 * แก้หมวดหมู่ที่ id ซ้ำใน org เดียวกัน (ทำให้เลือก/บันทึกหมวดถูกต้อง)
 * ใช้: pnpm exec tsx scripts/fix-duplicate-category-ids.ts
 * หรือกดปุ่ม "แก้ไข id หมวดหมู่ที่ซ้ำ" ใน Dialog จัดการหมวดหมู่
 */
export async function fixDuplicateCategoryIds(): Promise<{ updated: number }> {
  const categories = await getCollection<any>("categories");
  const all = await categories.find({}).sort({ organizationId: 1, id: 1, _id: 1 }).toArray();
  const byKey = new Map<string, any[]>();
  for (const c of all) {
    const org = c.organizationId ?? "_";
    const key = `${org}:${c.id}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(c);
  }
  let maxId = 0;
  for (const c of all) if (typeof c.id === "number" && c.id > maxId) maxId = c.id;
  let updated = 0;
  for (const [, docs] of byKey) {
    if (docs.length <= 1) continue;
    docs.sort((a, b) => (a._id < b._id ? -1 : 1));
    for (let i = 1; i < docs.length; i++) {
      maxId += 1;
      const newId = maxId;
      await categories.updateOne(
        { _id: docs[i]._id },
        { $set: { id: newId, updatedAt: new Date() } }
      );
      updated++;
      console.log(`[fixDuplicateCategoryIds] ${docs[i].name} (org ${docs[i].organizationId}) id ${docs[i].id} -> ${newId}`);
    }
  }
  if (maxId > 0) {
    const counters = await getCollection<{ _id: string; seq: number }>("counters");
    await counters.updateOne(
      { _id: "categories" },
      { $set: { seq: maxId } },
      { upsert: true }
    );
  }
  return { updated };
}

// ============ PRODUCTS ============
export async function getProducts(filters?: {
  categoryId?: number;
  status?: "active" | "inactive";
  search?: string;
  organizationId?: number | null;
}) {
  const products = await getCollection<any>("products");
  const query: Record<string, unknown> = {};
  if (filters && filters.categoryId != null) query.categoryId = filters.categoryId;
  // Default to "active" if status is not specified
  query.status = filters?.status || "active";
  if (filters?.search) query.name = { $regex: filters.search, $options: "i" };
  if (filters?.organizationId !== undefined && filters?.organizationId !== null) {
    query.organizationId = filters.organizationId;
  }
  return products.find(query).sort({ createdAt: -1 }).toArray();
}

export async function getProductById(id: number, organizationId?: number | null) {
  const products = await getCollection<any>("products");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return products.findOne(query);
}

export async function getProductBySku(sku: string, organizationId?: number | null) {
  const products = await getCollection<any>("products");
  const query: any = { sku };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return products.findOne(query);
}

export async function createProduct(data: {
  sku: string;
  name: string;
  description?: string;
  categoryId: number;
  price: string;
  cost?: string;
  imageUrl?: string | null;
  organizationId: number;
}) {
  try {
    console.log("[db.createProduct] Input data:", data);
    const products = await getCollection<any>("products");
    const now = new Date();
    const productId = await getNextSeq("products");
    console.log("[db.createProduct] Generated product ID:", productId);
    const doc = {
      id: productId,
    sku: data.sku,
    name: data.name,
      description: data.description ?? null,
    categoryId: data.categoryId,
    price: data.price,
      cost: data.cost ?? null,
      imageUrl: data.imageUrl ?? null,
    status: "active",
      organizationId: data.organizationId,
      createdAt: now,
      updatedAt: now,
    };
    console.log("[db.createProduct] Document to insert:", doc);
    const result = await products.insertOne(doc);
    console.log("[db.createProduct] Insert result:", result.insertedId);
    
    // สร้าง inventory entry อัตโนมัติ
    const inventory = await getCollection<any>("inventory");
    const existingInventory = await inventory.findOne({ productId });
    if (!existingInventory) {
      await inventory.insertOne({
        productId,
        quantity: 0,
        minThreshold: 10,
        createdAt: now,
        updatedAt: now,
      });
      console.log("[db.createProduct] Inventory entry created");
    }
    
    return doc;
  } catch (error) {
    console.error("[db.createProduct] Error:", error);
    throw error;
  }
}

export async function updateProduct(
  id: number,
  data: Partial<{
    sku: string;
    name: string;
    description: string;
    categoryId: number;
    price: string;
    cost: string;
    imageUrl: string | null | undefined;
    status: "active" | "inactive";
  }>,
  organizationId?: number | null
) {
  const products = await getCollection<any>("products");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  await products.updateOne(query, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteProduct(id: number, organizationId?: number | null) {
  const products = await getCollection<any>("products");
  const inventory = await getCollection<any>("inventory");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  console.log("[db.deleteProduct] Query:", JSON.stringify(query));
  
  // Check if product exists
  const product = await products.findOne(query);
  if (!product) {
    console.warn("[db.deleteProduct] No product found with query:", query);
    throw new Error("ไม่พบสินค้าที่ต้องการลบ");
  }
  
  // Delete inventory records for this product
  const inventoryDeleteResult = await inventory.deleteMany({ productId: id });
  console.log("[db.deleteProduct] Deleted inventory records:", inventoryDeleteResult.deletedCount);
  
  // Delete the product from database
  const result = await products.deleteOne(query);
  console.log("[db.deleteProduct] Delete result:", result);
  
  if (result.deletedCount === 0) {
    console.warn("[db.deleteProduct] Product found but not deleted. Query:", query);
    throw new Error("ไม่สามารถลบสินค้าได้");
  }
  
  console.log("[db.deleteProduct] Product deleted successfully from database");
  return result;
}

// ============ INVENTORY ============
export async function getInventoryList(search?: string, organizationId?: number | null) {
  const inventory = await getCollection<any>("inventory");
  const products = await getCollection<any>("products");
  const productQuery: any = {
    status: "active", // Filter only active products
  };
  if (organizationId !== undefined && organizationId !== null) {
    productQuery.organizationId = organizationId;
  }
  const inv = await inventory.find({}).toArray();
  const productIds = inv.map(item => item.productId);
  const productDocs = await products
    .find({ id: { $in: productIds }, ...productQuery })
    .toArray();
  const productMap = new Map(productDocs.map(p => [p.id, p]));
  const joined = inv
    .map(item => {
      const product = productMap.get(item.productId);
      if (!product) return null; // Skip if product is inactive or not found
      return {
        productId: item.productId.toString(),
        quantity: item.quantity,
        minThreshold: item.minThreshold ?? 10,
        sku: product.sku,
        productName: product.name,
        price: product.price,
      };
    })
    .filter(Boolean) as any[];

  const filtered = search
    ? joined.filter(
        item =>
          item.productName.toLowerCase().includes(search.toLowerCase()) ||
          item.sku.toLowerCase().includes(search.toLowerCase())
      )
    : joined;
  return filtered.sort((a, b) => a.productName.localeCompare(b.productName));
}

export async function getInventoryByProductId(productId: number, organizationId?: number | null) {
  const inventory = await getCollection<any>("inventory");
  const products = await getCollection<any>("products");
  
  // ตรวจสอบว่า product อยู่ใน organization เดียวกันหรือไม่
  if (organizationId !== undefined && organizationId !== null) {
    const product = await products.findOne({ id: productId, organizationId });
    if (!product) {
      return null; // Product ไม่อยู่ใน organization นี้
    }
  }
  
  return inventory.findOne({ productId });
}

export async function updateInventory(productId: number, quantity: number, organizationId?: number | null) {
  const inventory = await getCollection<any>("inventory");
  const products = await getCollection<any>("products");
  
  // ตรวจสอบว่า product อยู่ใน organization เดียวกันหรือไม่
  if (organizationId !== undefined && organizationId !== null) {
    const product = await products.findOne({ id: productId, organizationId });
    if (!product) {
      throw new Error("Product not found in your organization");
    }
  }
  
  const existing = await inventory.findOne({ productId });
  if (existing) {
    await inventory.updateOne(
      { productId },
      { $set: { quantity, updatedAt: new Date() } }
    );
    return;
  }
  await inventory.insertOne({
    productId,
    quantity,
    minThreshold: 10,
    updatedAt: new Date(),
  });
}

export async function getLowStockProducts(threshold?: number) {
  const inventory = await getCollection<any>("inventory");
  return inventory
    .find({ quantity: { $lte: threshold ?? 10 } })
    .toArray();
}

export async function getStockMovementHistory(productId: number) {
  const movements = await getCollection<any>("stockMovements");
  return movements.find({ productId }).sort({ createdAt: -1 }).toArray();
}

export async function recordStockMovement(data: {
  productId: number;
  movementType: "in" | "out" | "adjustment";
  quantity: number;
  reason?: string;
  userId?: number;
  notes?: string;
}) {
  const movements = await getCollection<any>("stockMovements");
  await movements.insertOne({
    productId: data.productId,
    movementType: data.movementType,
    quantity: data.quantity,
    reason: data.reason,
    userId: data.userId?.toString(),
    notes: data.notes,
    createdAt: new Date(),
  });
}

// ============ CUSTOMERS ============
export async function getCustomers(search?: string, organizationId?: number | null) {
  const customers = await getCollection<any>("customers");
  const query: any = {};
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  if (!search) {
    return customers.find(query).sort({ createdAt: -1 }).toArray();
  }
  const regex = new RegExp(search, "i");
  query.$or = [{ name: regex }, { phone: regex }, { email: regex }];
  return customers.find(query).sort({ createdAt: -1 }).toArray();
}

export async function getCustomerById(id: number, organizationId?: number | null) {
  const customers = await getCollection<any>("customers");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return customers.findOne(query);
}

export async function createCustomer(data: {
  id?: number; // ID ที่กำหนดเอง (optional)
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  organizationId: number;
}) {
  try {
    console.log("[createCustomer] Starting customer creation...");
    const customers = await getCollection<any>("customers");
    console.log("[createCustomer] Collection obtained");
    
    const now = new Date();
    
    // ถ้ามี ID ที่กำหนดมาให้ใช้ ID นั้น ถ้าไม่มีให้ใช้ auto-increment
    let customerId: number;
    if (data.id !== undefined) {
      customerId = data.id;
      console.log("[createCustomer] Using provided ID:", customerId);
      
      // ตรวจสอบว่า ID ไม่ซ้ำใน organization เดียวกัน
      const existing = await customers.findOne({ 
        id: customerId,
        organizationId: data.organizationId 
      });
      if (existing) {
        console.error("[createCustomer] ❌ ID already exists in this organization:", customerId);
        throw new Error(`ID ${customerId} ถูกใช้งานแล้วในรหัสนี้`);
      }
      
      // อัปเดต counter ของ organization นี้ให้สูงกว่า ID ที่กำหนด (เพื่อไม่ให้ ID ซ้ำในอนาคต)
      const counters = await getCollection<{ _id: string; seq: number }>("counters");
      const counterKey = `customers_org_${data.organizationId}`;
      const currentCounter = await counters.findOne({ _id: counterKey });
      const currentSeq = currentCounter?.seq ?? 0;
      if (customerId > currentSeq) {
        await counters.updateOne(
          { _id: counterKey },
          { $set: { seq: customerId } },
          { upsert: true }
        );
        console.log("[createCustomer] Counter updated to:", customerId, "for organization:", data.organizationId);
      }
    } else {
      // ใช้ counter แยกตาม organization
      customerId = await getNextSeqForOrg("customers", data.organizationId);
      console.log("[createCustomer] Generated customer ID:", customerId, "for organization:", data.organizationId);
    }
    
  const doc = {
    id: customerId,
    name: data.name,
    phone: data.phone ?? null,
    email: data.email ?? null,
    address: data.address ?? null,
    notes: data.notes ?? null,
    loyaltyPoints: 0, // เริ่มต้นที่ 0
    totalSpent: "0",
    organizationId: data.organizationId,
    createdAt: now,
    updatedAt: now,
  };
    
    console.log("[createCustomer] Document prepared:", { id: doc.id, name: doc.name, email: doc.email, organizationId: doc.organizationId });
    console.log("[createCustomer] Attempting to insert into MongoDB...");
    
    const result = await customers.insertOne(doc);
    console.log("[createCustomer] Insert result:", {
      insertedId: result.insertedId,
      acknowledged: result.acknowledged
    });
    
    if (!result.insertedId) {
      console.error("[createCustomer] ❌ Insert failed - no insertedId returned");
      throw new Error("Failed to insert customer into database - no insertedId");
    }
    
    if (!result.acknowledged) {
      console.error("[createCustomer] ❌ Insert not acknowledged by MongoDB");
      throw new Error("Failed to insert customer into database - not acknowledged");
    }
    
    // Verify the customer was actually inserted
    const verifyCustomer = await customers.findOne({ 
      id: customerId,
      organizationId: data.organizationId 
    });
    if (!verifyCustomer) {
      console.error("[createCustomer] ❌ Customer not found after insert");
      throw new Error("Failed to verify customer insertion");
    }
    
    console.log("[createCustomer] ✅ Customer successfully created and verified:", {
      id: verifyCustomer.id,
      name: verifyCustomer.name,
      email: verifyCustomer.email,
      organizationId: verifyCustomer.organizationId
    });
    
    return doc;
  } catch (error) {
    console.error("[createCustomer] ❌ Error creating customer:", error);
    console.error("[createCustomer] Error stack:", error instanceof Error ? error.stack : "No stack");
    if (error instanceof Error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
    throw error;
  }
}

export async function updateCustomer(
  id: number,
  data: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    loyaltyPoints: number;
    totalSpent: string;
  }>,
  organizationId?: number | null
) {
  const customers = await getCollection<any>("customers");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  await customers.updateOne(query, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteCustomer(id: number, organizationId?: number | null) {
  const customers = await getCollection<any>("customers");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  await customers.deleteOne(query);
}

export async function getCustomerPurchaseHistory(customerId: number, organizationId?: number | null) {
  const transactions = await getCollection<any>("transactions");
  const query: any = { customerId };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return transactions.find(query).sort({ createdAt: -1 }).toArray();
}

// ============ TRANSACTIONS ============
export async function createTransaction(data: {
  transactionNumber: string;
  cashierId: number;
  customerId?: number;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  paymentMethod: "cash" | "transfer" | "card" | "ewallet" | "mixed";
  notes?: string;
  organizationId: number;
}) {
  const transactions = await getCollection<any>("transactions");
  const now = new Date();
  const id = await getNextSeq("transactions");
  const doc = {
    id,
    transactionNumber: data.transactionNumber,
    cashierId: data.cashierId.toString(),
    customerId: data.customerId ?? null,
    subtotal: data.subtotal,
    tax: data.tax,
    discount: data.discount,
    total: data.total,
    paymentMethod: data.paymentMethod,
    paymentStatus: "completed",
    notes: data.notes,
    organizationId: data.organizationId,
    createdAt: now,
    updatedAt: now,
  };
  await transactions.insertOne(doc);
  return doc;
}

export async function getTransactionById(id: number, organizationId?: number | null) {
  const transactions = await getCollection<any>("transactions");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return transactions.findOne(query);
}

export async function getTransactionsByDateRange(startDate: Date, endDate: Date, organizationId?: number | null) {
  const transactions = await getCollection<any>("transactions");
  const query: any = { createdAt: { $gte: startDate, $lte: endDate } };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return transactions
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
}

export async function createTransactionItem(data: {
  transactionId: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  discount: string;
  subtotal: string;
  toppings?: Array<{ id: number; name: string; price: number }>; // ท็อปปิ้งที่เลือก
}) {
  const items = await getCollection<any>("transactionItems");
  await items.insertOne({
    id: await getNextSeq("transactionItems"),
    transactionId: data.transactionId,
    productId: data.productId,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    discount: data.discount,
    subtotal: data.subtotal,
    toppings: data.toppings || [], // เก็บท็อปปิ้งที่เลือก
    createdAt: new Date(),
  });
}

export async function getTransactionItems(transactionId: number) {
  const items = await getCollection<any>("transactionItems");
  return items.find({ transactionId }).toArray();
}

export async function getTransactionItemsByTransactionIds(transactionIds: number[]) {
  if (transactionIds.length === 0) return [];
  const items = await getCollection<any>("transactionItems");
  return items.find({ transactionId: { $in: transactionIds } }).toArray();
}

export async function getTopSellingProducts(
  startDate: Date,
  endDate: Date,
  limit: number = 10,
  organizationId?: number | null
) {
  const items = await getCollection<any>("transactionItems");
  const transactions = await getCollection<any>("transactions");
  const txQuery: any = { createdAt: { $gte: startDate, $lte: endDate } };
  if (organizationId !== undefined && organizationId !== null) {
    txQuery.organizationId = organizationId;
  }
  const txs = await transactions.find(txQuery).toArray();
  const txIds = new Set(txs.map(t => t.id));
  const allItems = await items.find({ transactionId: { $in: [...txIds] } }).toArray();
  const sales: Record<string, { productId: string; quantity: number; revenue: number }> = {};
  for (const item of allItems) {
    const key = item.productId.toString();
    if (!sales[key]) sales[key] = { productId: key, quantity: 0, revenue: 0 };
    sales[key].quantity += item.quantity;
    sales[key].revenue += parseFloat(item.subtotal || "0");
  }
  return Object.values(sales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// ============ ACTIVITY LOGS ============
export async function recordActivityLog(data: {
  userId: number;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const logs = await getCollection<any>("activityLogs");
  await logs.insertOne({
    ...data,
    userId: data.userId.toString(),
    entityId: data.entityId?.toString(),
    createdAt: new Date(),
  });
}

export async function getActivityLogs(userId?: number, limit: number = 100) {
  const logs = await getCollection<any>("activityLogs");
  const query = userId ? { userId: userId.toString() } : {};
  return logs.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
}

// ============ DISCOUNTS ============
export async function createDiscount(data: {
  name: string;
  description?: string;
  type: "percentage" | "fixed_amount" | "product_specific" | "bill_total";
  value: string;
  productId?: string;
  minBillAmount?: string;
  maxDiscountAmount?: string;
  startDate?: Date;
  endDate?: Date;
  autoApply?: boolean;
  organizationId: number;
}) {
  const discounts = await getCollection<any>("discounts");
  const now = new Date();
  const doc = {
    id: await getNextSeq("discounts"),
    name: data.name,
    description: data.description ?? null,
    type: data.type,
    value: data.value,
    productId: data.productId ?? null,
    minBillAmount: data.minBillAmount ?? null,
    maxDiscountAmount: data.maxDiscountAmount ?? null,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    autoApply: Boolean(data.autoApply),
    isActive: true,
    organizationId: data.organizationId,
    createdAt: now,
    updatedAt: now,
  };
  await discounts.insertOne(doc);
  return doc;
}

export async function getDiscounts(organizationId?: number | null) {
  const discounts = await getCollection<any>("discounts");
  const query: any = {};
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return discounts.find(query).sort({ createdAt: -1 }).toArray();
}

export async function getDiscountById(id: number) {
  const discounts = await getCollection<any>("discounts");
  return discounts.findOne({ id });
}

export async function getActiveDiscounts(organizationId?: number | null) {
  const discounts = await getCollection<any>("discounts");
  const now = new Date();
  const query: any = {
    isActive: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return discounts
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
}

export async function updateDiscount(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    type: "percentage" | "fixed_amount" | "product_specific" | "bill_total";
    value: string;
    productId: string;
    minBillAmount: string;
    maxDiscountAmount: string;
    startDate: Date;
    endDate: Date;
    autoApply: boolean;
    isActive: boolean;
  }>
) {
  const discounts = await getCollection<any>("discounts");
  await discounts.updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteDiscount(id: number) {
  const discounts = await getCollection<any>("discounts");
  await discounts.deleteOne({ id });
}

// ============ LOYALTY ============
export async function addLoyaltyPoints(
  customerId: number,
  points: number,
  description?: string,
  transactionId?: number,
  organizationId?: number | null
) {
  try {
    console.log("[addLoyaltyPoints] Starting...", { customerId, points, description, transactionId, organizationId });
    const customers = await getCollection<any>("customers");
    const transactions = await getCollection<any>("loyaltyTransactions");
    
    // Find customer with organizationId filter
    const query: any = { id: customerId };
    if (organizationId !== undefined && organizationId !== null) {
      query.organizationId = organizationId;
    }
    
    const customer = await customers.findOne(query);
    if (!customer) {
      console.error("[addLoyaltyPoints] ❌ Customer not found:", { customerId, organizationId });
      throw new Error(`Customer not found (ID: ${customerId}, Organization: ${organizationId})`);
    }
    
    const balanceBefore = customer.loyaltyPoints || 0;
  const balanceAfter = balanceBefore + points;

    console.log("[addLoyaltyPoints] Updating customer points:", {
      customerId,
      organizationId,
      balanceBefore,
      points,
      balanceAfter
    });
    
    // Update customer with organizationId filter
    await customers.updateOne(
      query,
      { $set: { loyaltyPoints: balanceAfter, updatedAt: new Date() } }
    );
    
    const loyaltyTransactionId = await getNextSeq("loyaltyTransactions");
    await transactions.insertOne({
      id: loyaltyTransactionId,
    customerId,
      transactionId: transactionId ?? null,
      type: "add",
    points,
    balanceBefore,
    balanceAfter,
      reason: description || "Earned points",
      createdAt: new Date(),
    });
    
    console.log("[addLoyaltyPoints] ✅ Points added successfully:", {
      customerId,
      organizationId,
      points,
      newBalance: balanceAfter
    });
    
    return { success: true, newBalance: balanceAfter };
  } catch (error) {
    console.error("[addLoyaltyPoints] ❌ Error:", error);
    throw error;
  }
}

export async function redeemLoyaltyPoints(
  customerId: number,
  points: number,
  description?: string
) {
  const customers = await getCollection<any>("customers");
  const transactions = await getCollection<any>("loyaltyTransactions");
  const customer = await customers.findOne({ id: customerId });
  if (!customer) throw new Error("Customer not found");
  const balanceBefore = customer.loyaltyPoints || 0;
  if (balanceBefore < points) throw new Error("Insufficient loyalty points");
  const balanceAfter = balanceBefore - points;
  await customers.updateOne({ id: customerId }, { $set: { loyaltyPoints: balanceAfter } });
  await transactions.insertOne({
    id: await getNextSeq("loyaltyTransactions"),
    customerId,
    transactionId: null,
    type: "redeem",
    points,
    balanceBefore,
    balanceAfter,
    description,
    createdAt: new Date(),
  });
}

export async function getLoyaltyTransactionHistory(customerId: number) {
  const transactions = await getCollection<any>("loyaltyTransactions");
  return transactions.find({ customerId }).sort({ createdAt: -1 }).toArray();
}

export async function getLoyaltySettings() {
  const settings = await getCollection<any>("loyaltySettings");
  return settings.findOne({ _id: "default" });
}

export async function updateLoyaltySettings(data: Record<string, unknown>) {
  const settings = await getCollection<any>("loyaltySettings");
  await settings.updateOne(
    { _id: "default" },
    { $set: { ...data, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  return settings.findOne({ _id: "default" });
}

// ============ RECEIPT TEMPLATES ============
export async function createReceiptTemplate(data: any) {
  const templates = await getCollection<any>("receiptTemplates");
  if (data.isDefault) {
    await templates.updateMany({}, { $set: { isDefault: false } });
  }
  const now = new Date();
  const doc = {
    id: await getNextSeq("receiptTemplates"),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await templates.insertOne(doc);
  return doc;
}

export async function updateReceiptTemplate(id: number, data: any) {
  const templates = await getCollection<any>("receiptTemplates");
  if (data.isDefault) {
    await templates.updateMany({}, { $set: { isDefault: false } });
  }
  await templates.updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
  return templates.findOne({ id });
}

export async function deleteReceiptTemplate(id: number) {
  const templates = await getCollection<any>("receiptTemplates");
  await templates.deleteOne({ id });
}

export async function getReceiptTemplates() {
  const templates = await getCollection<any>("receiptTemplates");
  return templates.find({}).sort({ name: 1 }).toArray();
}

export async function getDefaultReceiptTemplate() {
  const templates = await getCollection<any>("receiptTemplates");
  // หา template ที่ isDefault = true ก่อน
  const defaultTemplate = await templates.findOne({ isDefault: true });
  if (defaultTemplate) {
    return defaultTemplate;
  }
  // ถ้าไม่มี default ให้ใช้ template แรกที่เจอ
  const firstTemplate = await templates.findOne({}, { sort: { createdAt: -1 } });
  return firstTemplate;
}

export async function getReceiptTemplate(id: number) {
  const templates = await getCollection<any>("receiptTemplates");
  return templates.findOne({ id });
}

// ============ DISCOUNT CODES ============
export async function createDiscountCode(data: {
  code: string;
  discountId: number;
  maxUsageCount: number;
  description?: string;
  endDate?: Date;
}) {
  const codes = await getCollection<any>("discountCodes");
  const now = new Date();
  const doc = {
    id: await getNextSeq("discountCodes"),
    code: data.code,
    discountId: data.discountId,
    maxUsageCount: data.maxUsageCount ?? null,
    usageCount: 0,
    description: data.description ?? null,
    endDate: data.endDate ?? null,
    isActive: true,
    startDate: now,
    createdAt: now,
    updatedAt: now,
  };
  await codes.insertOne(doc);
  return doc;
}

export async function validateDiscountCode(code: string) {
  const codes = await getCollection<any>("discountCodes");
  const now = new Date();
  const record = await codes.findOne({ code, isActive: true });
  if (!record) return null;
  if (record.startDate && record.startDate > now) return null;
  if (record.endDate && record.endDate < now) return null;
  if (record.maxUsageCount !== null && record.usageCount >= record.maxUsageCount) {
    return null;
  }
  return record;
}

export async function incrementDiscountCodeUsage(codeId: number) {
  const codes = await getCollection<any>("discountCodes");
  await codes.updateOne({ id: codeId }, { $inc: { usageCount: 1 } });
}

export async function getDiscountCodeById(id: number) {
  const codes = await getCollection<any>("discountCodes");
  return codes.findOne({ id });
}

export async function listDiscountCodes(filters?: {
  isActive?: boolean;
  discountId?: number;
}) {
  const codes = await getCollection<any>("discountCodes");
  const query: Record<string, unknown> = {};
  if (filters?.isActive !== undefined) query.isActive = filters.isActive;
  if (filters?.discountId !== undefined) query.discountId = filters.discountId;
  return codes.find(query).sort({ createdAt: -1 }).toArray();
}

export async function updateDiscountCode(id: number, data: {
  isActive?: boolean;
  maxUsageCount?: number;
  endDate?: Date;
}) {
  const codes = await getCollection<any>("discountCodes");
  await codes.updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteDiscountCode(id: number) {
  const codes = await getCollection<any>("discountCodes");
  await codes.deleteOne({ id });
}

// ============ DASHBOARD ============
export async function getDiscountCodeStatistics() {
  const codes = await getCollection<any>("discountCodes");
  const allCodes = await codes.find({}).toArray();
  const totalCodes = allCodes.length;
  const activeCodes = allCodes.filter(c => c.isActive).length;
  const usedCodes = allCodes.filter(c => (c.usageCount || 0) > 0).length;
  const totalUsage = allCodes.reduce((sum, c) => sum + (c.usageCount || 0), 0);
  const totalCapacity = allCodes.reduce((sum, c) => sum + (c.maxUsageCount || 0), 0);
  return {
    totalCodes,
    activeCodes,
    usedCodes,
    totalUsage,
    totalCapacity,
    utilizationRate: totalCapacity > 0 ? (totalUsage / totalCapacity) * 100 : 0,
  };
}

export async function getTopDiscountCodes(limit: number = 5) {
  const codes = await getCollection<any>("discountCodes");
  return codes.find({}).sort({ usageCount: -1 }).limit(limit).toArray();
}

export async function getRecentActivities(limit: number = 10) {
  const logs = await getCollection<any>("activityLogs");
  return logs.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function getDashboardSummary(organizationId?: number | null) {
  const transactions = await getCollection<any>("transactions");
  const customers = await getCollection<any>("customers");
  const products = await getCollection<any>("products");
  const activityLogs = await getCollection<any>("activityLogs");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Build query with organizationId filter
  const transactionQuery: any = {};
  const customerQuery: any = {};
  const productQuery: any = {};
  
  if (organizationId !== undefined && organizationId !== null) {
    transactionQuery.organizationId = organizationId;
    customerQuery.organizationId = organizationId;
    productQuery.organizationId = organizationId;
  }

  // Get today's sales
  const todayTransactionQuery = {
    ...transactionQuery,
    createdAt: { $gte: today },
    paymentStatus: "completed",
  };
  const todaySales = await transactions.find(todayTransactionQuery).toArray();
  const todaySalesTotal = todaySales.reduce((sum, t) => sum + parseFloat(t.total || "0"), 0);

  // Get yesterday's sales for comparison
  const yesterdayTransactionQuery = {
    ...transactionQuery,
    createdAt: { $gte: yesterday, $lt: today },
    paymentStatus: "completed",
  };
  const yesterdaySales = await transactions.find(yesterdayTransactionQuery).toArray();
  const yesterdaySalesTotal = yesterdaySales.reduce((sum, t) => sum + parseFloat(t.total || "0"), 0);

  // Calculate today's sales trend
  const todaySalesTrend = yesterdaySalesTotal > 0 
    ? ((todaySalesTotal - yesterdaySalesTotal) / yesterdaySalesTotal * 100).toFixed(1)
    : "0";

  // Get month's sales
  const monthTransactionQuery = {
    ...transactionQuery,
    createdAt: { $gte: monthStart },
    paymentStatus: "completed",
  };
  const monthSales = await transactions.find(monthTransactionQuery).toArray();
  const monthSalesTotal = monthSales.reduce((sum, t) => sum + parseFloat(t.total || "0"), 0);

  // Get total products count
  productQuery.status = "active";
  const totalProducts = await products.countDocuments(productQuery);

  // Get total customers count
  const totalCustomers = await customers.countDocuments(customerQuery);

  // Get recent activities
  const recentActivities = await activityLogs
    .find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  return {
    todaySalesTotal,
    todaySalesTrend: parseFloat(todaySalesTrend),
    monthSalesTotal,
    totalProducts,
    totalCustomers,
    recentActivities,
  };
}

// ============ COMPANY PROFILE (ข้อมูลกิจการ) ============
export type CompanyProfileDoc = {
  id: number;
  name: string;
  taxId: string; // เลขผู้เสียภาษี 13 หลัก
  address: string;
  district?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  businessType?: string; // ประเภทกิจการ
  vatRegistered: boolean; // จด VAT หรือไม่
  vatNumber?: string; // เลข VAT (ถ้ามี)
  organizationId: number; // เพิ่ม organizationId เพื่อแยกข้อมูล
  createdAt: Date;
  updatedAt: Date;
};

export async function getCompanyProfile(organizationId?: number | null) {
  const profiles = await getCollection<CompanyProfileDoc>("companyProfiles");
  const query: any = {};
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return profiles.findOne(query);
}

export async function upsertCompanyProfile(
  data: {
    name: string;
    taxId: string;
    address: string;
    district?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    businessType?: string;
    vatRegistered: boolean;
    vatNumber?: string;
  },
  organizationId: number
) {
  const profiles = await getCollection<CompanyProfileDoc>("companyProfiles");
  const existing = await profiles.findOne({ organizationId });
  const now = new Date();
  
  if (existing) {
    await profiles.updateOne(
      { organizationId },
      { $set: { ...data, updatedAt: now } }
    );
    return profiles.findOne({ organizationId });
  } else {
    const id = await getNextSeq("companyProfiles");
    const doc: CompanyProfileDoc = {
      id,
      ...data,
      organizationId, // บันทึก organizationId
      createdAt: now,
      updatedAt: now,
    };
    await profiles.insertOne(doc);
    return doc;
  }
}

// ============ TAX INVOICES (ใบกำกับภาษี) ============
export type TaxInvoiceDoc = {
  id: number;
  invoiceNo: string; // เลขที่ใบกำกับภาษี
  invoiceType: "full" | "abbreviated"; // เต็มรูป / อย่างย่อ
  transactionId: number; // อ้างอิง transaction
  date: Date;
  customerName: string;
  customerTaxId?: string; // เลขผู้เสียภาษีลูกค้า (ถ้ามี)
  customerAddress?: string;
  subtotal: number; // ยอดก่อน VAT
  vat: number; // VAT 7%
  total: number; // ยอดรวม
  status: "draft" | "issued" | "cancelled";
  organizationId: number; // เพิ่ม organizationId เพื่อแยกข้อมูล
  issuedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export async function createTaxInvoice(
  data: {
    invoiceNo: string;
    invoiceType: "full" | "abbreviated";
    transactionId: number;
    date: Date;
    customerName: string;
    customerTaxId?: string;
    customerAddress?: string;
    subtotal: number;
    vat: number;
    total: number;
  },
  organizationId: number
) {
  const invoices = await getCollection<TaxInvoiceDoc>("taxInvoices");
  const now = new Date();
  const id = await getNextSeq("taxInvoices");
  const doc: TaxInvoiceDoc = {
    id,
    ...data,
    organizationId, // บันทึก organizationId
    status: "issued",
    issuedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await invoices.insertOne(doc);
  return doc;
}

export async function getTaxInvoiceById(id: number, organizationId?: number | null) {
  const invoices = await getCollection<TaxInvoiceDoc>("taxInvoices");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return invoices.findOne(query);
}

export async function getTaxInvoiceByTransactionId(transactionId: number, organizationId?: number | null) {
  const invoices = await getCollection<TaxInvoiceDoc>("taxInvoices");
  const query: any = { transactionId };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return invoices.findOne(query);
}

export async function getTaxInvoicesByDateRange(startDate: Date, endDate: Date, organizationId?: number | null) {
  const invoices = await getCollection<TaxInvoiceDoc>("taxInvoices");
  const query: any = {
    date: { $gte: startDate, $lte: endDate },
    status: "issued",
  };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return invoices
    .find(query)
    .sort({ date: -1 })
    .toArray();
}

export async function cancelTaxInvoice(id: number, organizationId?: number | null) {
  const invoices = await getCollection<TaxInvoiceDoc>("taxInvoices");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  await invoices.updateOne(
    query,
    { $set: { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() } }
  );
  return invoices.findOne(query);
}

// ============ VAT REPORTS (รายงานภาษีขาย/ซื้อ) ============
export type VatReportDoc = {
  id: number;
  month: string; // Format: "YYYY-MM"
  year: number;
  monthNumber: number;
  totalSales: number; // ยอดขายรวม
  vatSales: number; // VAT ขาย (7%)
  vatBuy: number; // VAT ซื้อ
  vatPay: number; // VAT ที่ต้องจ่าย (vatSales - vatBuy)
  status: "draft" | "submitted"; // สถานะการยื่น
  organizationId: number; // เพิ่ม organizationId เพื่อแยกข้อมูล
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export async function getVatReport(month: string, organizationId?: number | null) {
  const reports = await getCollection<VatReportDoc>("vatReports");
  const query: any = { month };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return reports.findOne(query);
}

export async function createOrUpdateVatReport(
  data: {
    month: string;
    totalSales: number;
    vatSales: number;
    vatBuy: number;
  },
  organizationId: number
) {
  const reports = await getCollection<VatReportDoc>("vatReports");
  const [year, monthNum] = data.month.split("-").map(Number);
  const vatPay = data.vatSales - data.vatBuy;
  const now = new Date();
  
  const existing = await reports.findOne({ month: data.month, organizationId });
  if (existing) {
    await reports.updateOne(
      { id: existing.id },
      {
        $set: {
          totalSales: data.totalSales,
          vatSales: data.vatSales,
          vatBuy: data.vatBuy,
          vatPay,
          updatedAt: now,
        },
      }
    );
    return reports.findOne({ id: existing.id });
  } else {
    const id = await getNextSeq("vatReports");
    const doc: VatReportDoc = {
      id,
      month: data.month,
      year,
      monthNumber: monthNum,
      totalSales: data.totalSales,
      vatSales: data.vatSales,
      vatBuy: data.vatBuy,
      vatPay,
      status: "draft",
      organizationId, // บันทึก organizationId
      createdAt: now,
      updatedAt: now,
    };
    await reports.insertOne(doc);
    return doc;
  }
}

export async function getVatReportsByYear(year: number, organizationId?: number | null) {
  const reports = await getCollection<VatReportDoc>("vatReports");
  const query: any = { year };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return reports
    .find(query)
    .sort({ monthNumber: 1 })
    .toArray();
}

export async function submitVatReport(month: string, organizationId?: number | null) {
  const reports = await getCollection<VatReportDoc>("vatReports");
  const query: any = { month };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  await reports.updateOne(
    query,
    { $set: { status: "submitted", submittedAt: new Date(), updatedAt: new Date() } }
  );
  return reports.findOne(query);
}

// ============ WITHHOLDING TAX (ภาษีหัก ณ ที่จ่าย) ============
export type WithholdingTaxDoc = {
  id: number;
  documentNo: string; // เลขที่หนังสือรับรอง
  documentType: "pnd3" | "pnd53"; // ภ.ง.ด.3 หรือ ภ.ง.ด.53
  payeeName: string; // ชื่อผู้รับเงิน
  payeeTaxId: string; // เลขผู้เสียภาษีผู้รับเงิน
  payeeAddress?: string;
  paymentDate: Date;
  paymentType: "service" | "rent" | "freelance" | "other"; // ประเภทการจ่าย
  paymentAmount: number; // จำนวนเงินที่จ่าย
  withholdingRate: number; // อัตราหัก (เช่น 3%, 5%)
  withholdingAmount: number; // จำนวนเงินหัก ณ ที่จ่าย
  netAmount: number; // จำนวนเงินสุทธิ
  status: "draft" | "issued" | "cancelled";
  issuedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export async function createWithholdingTax(data: {
  documentNo: string;
  documentType: "pnd3" | "pnd53";
  payeeName: string;
  payeeTaxId: string;
  payeeAddress?: string;
  paymentDate: Date;
  paymentType: "service" | "rent" | "freelance" | "other";
  paymentAmount: number;
  withholdingRate: number;
}) {
  const docs = await getCollection<WithholdingTaxDoc>("withholdingTaxes");
  const now = new Date();
  const id = await getNextSeq("withholdingTaxes");
  const withholdingAmount = (data.paymentAmount * data.withholdingRate) / 100;
  const netAmount = data.paymentAmount - withholdingAmount;
  
  const doc: WithholdingTaxDoc = {
    id,
    ...data,
    withholdingAmount,
    netAmount,
    status: "issued",
    issuedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await docs.insertOne(doc);
  return doc;
}

export async function getWithholdingTaxById(id: number) {
  const docs = await getCollection<WithholdingTaxDoc>("withholdingTaxes");
  return docs.findOne({ id });
}

export async function getWithholdingTaxesByDateRange(startDate: Date, endDate: Date) {
  const docs = await getCollection<WithholdingTaxDoc>("withholdingTaxes");
  return docs
    .find({
      paymentDate: { $gte: startDate, $lte: endDate },
      status: "issued",
    })
    .sort({ paymentDate: -1 })
    .toArray();
}

export async function getWithholdingTaxesByType(
  documentType: "pnd3" | "pnd53",
  year: number
) {
  const docs = await getCollection<WithholdingTaxDoc>("withholdingTaxes");
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  return docs
    .find({
      documentType,
      paymentDate: { $gte: startDate, $lte: endDate },
      status: "issued",
    })
    .sort({ paymentDate: 1 })
    .toArray();
}

// ============ ANNUAL INCOME SUMMARY (สรุปรายได้ประจำปี) ============
export type AnnualIncomeSummaryDoc = {
  id: number;
  year: number;
  totalRevenue: number; // รายได้รวม
  totalCost: number; // ต้นทุนรวม
  grossProfit: number; // กำไรขั้นต้น
  totalExpenses: number; // ค่าใช้จ่ายรวม
  netProfit: number; // กำไรสุทธิ
  status: "draft" | "finalized";
  finalizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export async function getAnnualIncomeSummary(year: number) {
  const summaries = await getCollection<AnnualIncomeSummaryDoc>("annualIncomeSummaries");
  return summaries.findOne({ year });
}

export async function createOrUpdateAnnualIncomeSummary(data: {
  year: number;
  totalRevenue: number;
  totalCost: number;
  totalExpenses: number;
}) {
  const summaries = await getCollection<AnnualIncomeSummaryDoc>("annualIncomeSummaries");
  const grossProfit = data.totalRevenue - data.totalCost;
  const netProfit = grossProfit - data.totalExpenses;
  const now = new Date();
  
  const existing = await summaries.findOne({ year: data.year });
  if (existing) {
    await summaries.updateOne(
      { id: existing.id },
      {
        $set: {
          totalRevenue: data.totalRevenue,
          totalCost: data.totalCost,
          grossProfit,
          totalExpenses: data.totalExpenses,
          netProfit,
          updatedAt: now,
        },
      }
    );
    return summaries.findOne({ id: existing.id });
  } else {
    const id = await getNextSeq("annualIncomeSummaries");
    const doc: AnnualIncomeSummaryDoc = {
      id,
      year: data.year,
      totalRevenue: data.totalRevenue,
      totalCost: data.totalCost,
      grossProfit,
      totalExpenses: data.totalExpenses,
      netProfit,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    await summaries.insertOne(doc);
    return doc;
  }
}

export async function finalizeAnnualIncomeSummary(year: number) {
  const summaries = await getCollection<AnnualIncomeSummaryDoc>("annualIncomeSummaries");
  await summaries.updateOne(
    { year },
    { $set: { status: "finalized", finalizedAt: new Date(), updatedAt: new Date() } }
  );
  return summaries.findOne({ year });
}

// ============ PURCHASE INVOICES (ใบรับซื้อ) ============
export type PurchaseInvoiceDoc = {
  id: number;
  invoiceNo: string; // เลขที่ใบรับซื้อ
  supplierName: string; // ชื่อผู้ขาย
  supplierTaxId?: string; // เลขผู้เสียภาษีผู้ขาย
  supplierAddress?: string;
  date: Date;
  subtotal: number; // ยอดก่อน VAT
  vat: number; // VAT ซื้อ (7%)
  total: number; // ยอดรวม
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  status: "draft" | "received" | "cancelled";
  organizationId: number; // เพิ่ม organizationId เพื่อแยกข้อมูล
  receivedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export async function createPurchaseInvoice(
  data: {
    invoiceNo: string;
    supplierName: string;
    supplierTaxId?: string;
    supplierAddress?: string;
    date: Date;
    subtotal: number;
    vat: number;
    total: number;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  },
  organizationId: number
) {
  const invoices = await getCollection<PurchaseInvoiceDoc>("purchaseInvoices");
  const now = new Date();
  const id = await getNextSeq("purchaseInvoices");
  const doc: PurchaseInvoiceDoc = {
    id,
    ...data,
    organizationId, // บันทึก organizationId
    status: "received",
    receivedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await invoices.insertOne(doc);
  return doc;
}

export async function getPurchaseInvoiceById(id: number, organizationId?: number | null) {
  const invoices = await getCollection<PurchaseInvoiceDoc>("purchaseInvoices");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return invoices.findOne(query);
}

export async function getPurchaseInvoicesByDateRange(startDate: Date, endDate: Date, organizationId?: number | null) {
  const invoices = await getCollection<PurchaseInvoiceDoc>("purchaseInvoices");
  const query: any = {
    date: { $gte: startDate, $lte: endDate },
    status: "received",
  };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return invoices
    .find(query)
    .sort({ date: -1 })
    .toArray();
}

export async function cancelPurchaseInvoice(id: number, organizationId?: number | null) {
  const invoices = await getCollection<PurchaseInvoiceDoc>("purchaseInvoices");
  const query: any = { id };
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  await invoices.updateOne(
    query,
    { $set: { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() } }
  );
  return invoices.findOne(query);
}

// ============ TOPPINGS ============
export type ToppingDoc = {
  id: number;
  name: string;
  price: number; // ราคาเป็น number (บาท)
  organizationId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getToppings(organizationId?: number | null) {
  const toppings = await getCollection<ToppingDoc>("toppings");
  const query: any = {};
  if (organizationId !== undefined && organizationId !== null) {
    query.organizationId = organizationId;
  }
  return toppings.find(query).sort({ createdAt: -1 }).toArray();
}

export async function getToppingById(id: number) {
  const toppings = await getCollection<ToppingDoc>("toppings");
  return toppings.findOne({ id });
}

export async function createTopping(data: {
  name: string;
  price: number;
  organizationId: number | null;
}) {
  const toppings = await getCollection<ToppingDoc>("toppings");
  const id = await getNextSeq("toppings");
  const now = new Date();
  const doc: ToppingDoc = {
    id,
    name: data.name,
    price: data.price,
    organizationId: data.organizationId,
    createdAt: now,
    updatedAt: now,
  };
  await toppings.insertOne(doc);
  return doc;
}

export async function updateTopping(id: number, data: {
  name?: string;
  price?: number;
}) {
  const toppings = await getCollection<ToppingDoc>("toppings");
  const updateData: any = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.price !== undefined) updateData.price = data.price;
  await toppings.updateOne({ id }, { $set: updateData });
  return toppings.findOne({ id });
}

export async function deleteTopping(id: number) {
  const toppings = await getCollection<ToppingDoc>("toppings");
  await toppings.deleteOne({ id });
  return { success: true };
}

// ============ STORES (ห้องร้าน) ============
export type StoreDoc = {
  id: number;
  storeCode: string; // รหัสร้าน (ใช้เข้าห้อง) เช่น "POS-UDON-2026"
  name: string; // ชื่อร้าน
  ownerId: number; // หัวหน้าร้าน (user id)
  createdAt: Date;
  updatedAt: Date;
};

export type StoreInviteDoc = {
  id: number;
  code: string; // รหัสเข้าห้องร้าน
  storeId: number; // อ้างอิงร้าน
  createdBy: number; // user id ที่สร้างรหัส
  active: boolean; // รหัสใช้งานได้หรือไม่
  createdAt: Date;
  updatedAt: Date;
};

// สร้างร้านใหม่ (สำหรับหัวหน้า)
export async function createStore(data: {
  storeCode: string;
  name: string;
  ownerId: number;
}) {
  const stores = await getCollection<StoreDoc>("stores");
  
  // ตรวจสอบว่า storeCode ซ้ำหรือไม่
  const existing = await stores.findOne({ storeCode: data.storeCode });
  if (existing) {
    throw new Error(`รหัสร้าน "${data.storeCode}" ถูกใช้งานแล้ว`);
  }
  
  const now = new Date();
  const id = await getNextSeq("stores");
  const doc: StoreDoc = {
    id,
    storeCode: data.storeCode,
    name: data.name,
    ownerId: data.ownerId,
    createdAt: now,
    updatedAt: now,
  };
  await stores.insertOne(doc);
  return doc;
}

// ดึงร้านตาม ID
export async function getStoreById(id: number) {
  const stores = await getCollection<StoreDoc>("stores");
  return stores.findOne({ id });
}

// ดึงร้านตาม storeCode
export async function getStoreByCode(storeCode: string) {
  const stores = await getCollection<StoreDoc>("stores");
  return stores.findOne({ storeCode });
}

// ดึงร้านทั้งหมดของ owner
export async function getStoresByOwner(ownerId: number) {
  const stores = await getCollection<StoreDoc>("stores");
  return stores.find({ ownerId }).sort({ createdAt: -1 }).toArray();
}

// สร้างรหัสเข้าร้าน (สำหรับหัวหน้า)
export async function createStoreInvite(data: {
  code: string;
  storeId: number;
  createdBy: number;
}) {
  const invites = await getCollection<StoreInviteDoc>("storeInvites");
  
  // ตรวจสอบว่า code ซ้ำหรือไม่
  const existing = await invites.findOne({ code: data.code });
  if (existing) {
    throw new Error(`รหัส "${data.code}" ถูกใช้งานแล้ว`);
  }
  
  const now = new Date();
  const id = await getNextSeq("storeInvites");
  const doc: StoreInviteDoc = {
    id,
    code: data.code,
    storeId: data.storeId,
    createdBy: data.createdBy,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await invites.insertOne(doc);
  return doc;
}

// ดึงรหัสเข้าร้านตาม code
export async function getStoreInviteByCode(code: string) {
  const invites = await getCollection<StoreInviteDoc>("storeInvites");
  return invites.findOne({ code, active: true });
}

// ดึงรหัสเข้าร้านทั้งหมดของร้าน
export async function getStoreInvitesByStore(storeId: number) {
  const invites = await getCollection<StoreInviteDoc>("storeInvites");
  return invites.find({ storeId }).sort({ createdAt: -1 }).toArray();
}

// อัปเดตสถานะรหัสเข้าร้าน
export async function updateStoreInvite(id: number, active: boolean) {
  const invites = await getCollection<StoreInviteDoc>("storeInvites");
  await invites.updateOne(
    { id },
    { $set: { active, updatedAt: new Date() } }
  );
  return invites.findOne({ id });
}

// พนักงานเข้าร้าน (อัปเดต storeId และ organizationId ของ user)
export async function joinStore(userId: number, storeId: number, organizationId: number) {
  const users = await getCollection<UserDoc>("users");
  await users.updateOne(
    { id: userId },
    { $set: { storeId, organizationId, updatedAt: new Date() } }
  );
  return users.findOne({ id: userId });
}

// พนักงานออกจากร้าน (ล้าง storeId และ organizationId)
export async function leaveStore(userId: number) {
  const users = await getCollection<UserDoc>("users");
  await users.updateOne(
    { id: userId },
    { $set: { storeId: null, organizationId: null, updatedAt: new Date() } }
  );
  return users.findOne({ id: userId });
}

// ดึงผู้ใช้ทั้งหมดในร้าน
export async function getUsersByStore(storeId: number) {
  const users = await getCollection<UserDoc>("users");
  return users.find({ storeId }).sort({ createdAt: 1 }).toArray();
}

// ============ SYSTEM CONFIG (รหัสหลักสำหรับระบบสร้างรหัสแอดมิน) ============
const MASTER_CODE_KEY = "masterCodeForAdminCodes";

/** คืนรหัสหลักที่ใช้ verify (DB ก่อน ไม่มีถึงใช้ ENV) — ครั้งแรกใช้ ORDERA_MASTER_CODE จาก env */
export async function getMasterCodeForAdminCodesForVerify(): Promise<string | null> {
  const col = await getCollection<{ _id: string; value: string }>("systemConfig");
  const row = await col.findOne({ _id: MASTER_CODE_KEY });
  const fromDb = row?.value;
  const fromEnv = ENV.masterCodeForAdminCodes;
  const effective = fromDb != null && String(fromDb).trim() !== "" ? String(fromDb).trim() : (fromEnv || "").trim();
  return effective || null;
}

/** ดูว่ามีการตั้งรหัสหลักใน DB หรือยัง (สำหรับหน้า Settings) */
export async function getMasterCodeForAdminCodesConfig(): Promise<{ isConfigured: boolean }> {
  const col = await getCollection<{ _id: string; value: string }>("systemConfig");
  const row = await col.findOne({ _id: MASTER_CODE_KEY });
  const isConfigured = !!(row?.value && String(row.value).trim().length > 0);
  return { isConfigured };
}

/** ตั้ง/เปลี่ยนรหัสหลัก (ความยาวขั้นต่ำ 8) */
export async function setMasterCodeForAdminCodes(code: string): Promise<void> {
  const trimmed = code.trim();
  if (trimmed.length < 8) throw new Error("รหัสต้องมีอย่างน้อย 8 ตัวอักษร");
  const col = await getCollection<{ _id: string; value: string; updatedAt?: Date }>("systemConfig");
  await col.updateOne(
    { _id: MASTER_CODE_KEY },
    { $set: { value: trimmed, updatedAt: new Date() } },
    { upsert: true }
  );
}
