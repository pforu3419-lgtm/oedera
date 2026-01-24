import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, adminProcedure, managerProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { sendDailySalesReport, sendLowStockAlert, testEmailConnection } from "./_core/emailService";
import { sdk } from "./_core/sdk";
import { parse as parseCookie } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";

const ADMIN_CODES_SESSION_COOKIE = "ordera_admin_codes_session";
const ADMIN_CODES_SESSION_MAX_AGE = 60 * 60; // 1 ชม.

async function verifyAdminCodesSessionCookie(cookieHeader: string | string[] | undefined): Promise<boolean> {
  const h = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  const parsed = parseCookie(h || "");
  const token = parsed[ADMIN_CODES_SESSION_COOKIE];
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return (payload as { purpose?: string }).purpose === "admin-codes";
  } catch {
    return false;
  }
}

// ไม่ต้องใช้ adminProcedure ที่แก้ไขแล้ว เพราะเรามี managerProcedure แยกแล้ว

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure
      .input(z.object({}).optional())
      .query((opts) => opts.ctx.user),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "ชื่อผู้ใช้ต้องไม่ว่าง"),
          email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
          password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          console.log("[Register] ========== START REGISTRATION ==========");
          console.log("[Register] Starting registration for:", input.email);
          
          const emailLower = input.email.toLowerCase();
          console.log("[Register] Searching for email (lowercase):", emailLower);
          
          // ✅ ตรวจสอบ email ก่อน (สำคัญมาก!)
          const existing = await db.getUserByEmail(input.email);
          if (existing) {
            console.log("[Register] ❌ Email already exists:", {
              id: existing.id,
              email: existing.email,
              name: existing.name,
              openId: existing.openId,
              role: existing.role
            });
            throw new TRPCError({
              code: "CONFLICT",
              message: "อีเมลนี้ถูกใช้งานแล้ว",
            });
          }
          console.log("[Register] ✅ Email is available");

          // ผู้ใช้ใหม่ = role "user" (ยังไม่มีร้าน) ต้องกรอกรหัสแอดมินเพื่อสร้างร้านและเป็น Admin
          const role = "user";
          console.log("[Register] Creating user:", { name: input.name, email: input.email, role });

          const newUser = await db.createInternalUser({
            name: input.name,
            email: input.email,
            password: input.password,
            role,
          });

          console.log("[Register] ✅ User created successfully:", { 
            id: newUser.id, 
            email: newUser.email, 
            openId: newUser.openId 
          });

          // ✅ สร้าง session token และ login อัตโนมัติ
          console.log("[Register] Creating session token...");
          try {
            const sessionToken = await sdk.createSessionToken(newUser.openId, {
              name: newUser.name || "",
              role: newUser.role,
            });
            console.log("[Register] ✅ Session token created");
          
            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, sessionToken, {
              ...cookieOptions,
              maxAge: ONE_YEAR_MS,
            });
            console.log("[Register] ✅ Cookie set");
          } catch (tokenError) {
            console.error("[Register] ❌ Failed to create session token:", tokenError);
            // ⚠️ ถ้า session token creation fails แต่ user ถูกสร้างแล้ว
            // เรายังคง return success เพราะ user ถูกสร้างแล้ว
            // แต่จะไม่ set cookie (user ต้อง login ใหม่)
            console.warn("[Register] ⚠️ User created but session token failed - user can login manually");
          }

          console.log("[Register] ========== REGISTRATION SUCCESS ==========");
          return { success: true, message: "สมัครสมาชิกสำเร็จ" };
        } catch (error) {
          console.error("[Register] ========== REGISTRATION FAILED ==========");
          console.error("[Register] Error:", error);
          console.error("[Register] Error stack:", error instanceof Error ? error.stack : "No stack");
          if (error instanceof TRPCError) {
            throw error;
          }
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("[Register] Unexpected error:", errorMessage);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `เกิดข้อผิดพลาดในการสมัครสมาชิก: ${errorMessage}`,
            cause: error,
          });
        }
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
          password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        console.log("[Login] Attempting login for:", input.email);
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          console.log("[Login] User not found:", input.email);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
          });
        }
        console.log("[Login] User found:", { id: user.id, email: user.email, hasPassword: !!user.passwordHash });
        if (!user.passwordHash || !user.passwordSalt) {
          console.log("[Login] User has no password set");
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "บัญชีนี้ไม่ได้ตั้งรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ",
          });
        }
        const passwordValid = db.verifyUserPassword(user, input.password);
        console.log("[Login] Password verification result:", passwordValid);
        if (!passwordValid) {
          console.log("[Login] Invalid password for:", input.email);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
          });
        }
        console.log("[Login] Login successful for:", input.email);

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          role: user.role, // ฝัง role ใน token
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });
        return { 
          success: true,
          role: user.role, // ส่ง role กลับไปใน response
          name: user.name,
          email: user.email,
        } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    redeemAdminCode: protectedProcedure
      .input(z.object({ code: z.string().min(1, "กรุณากรอกรหัสแอดมิน") }))
      .mutation(async ({ input, ctx }) => {
        const { store } = await db.redeemAdminCode(input.code.trim(), ctx.user!.id);
        return { success: true, store, message: "เชื่อมต่อร้านสำเร็จ คุณเป็น Admin ประจำร้านแล้ว" };
      }),
  }),

  // ============ ADMIN CODES (ระบบสร้างรหัสแอดมิน - ใช้รหัสหลักเข้าถึง) ============
  adminCodes: router({
    // ตรวจสอบว่าผ่านรหัสหลักแล้ว (มี session)
    checkAccess: publicProcedure.query(async ({ ctx }) => {
      const ok = await verifyAdminCodesSessionCookie(ctx.req.headers.cookie);
      return { allowed: ok };
    }),
    // กรอกรหัสหลัก เพื่อเข้าสู่ระบบสร้างรหัสแอดมิน (ตั้ง ORDERA_MASTER_CODE ใน env.runtime)
    verifyAccess: publicProcedure
      .input(z.object({ code: z.string().min(1, "กรุณากรอกรหัส") }))
      .mutation(async ({ input, ctx }) => {
        const master = await db.getMasterCodeForAdminCodesForVerify();
        if (!master) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ระบบสร้างรหัสแอดมินปิดใช้งาน" });
        }
        if (input.code.trim() !== master) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "รหัสไม่ถูกต้อง" });
        }
        const secret = new TextEncoder().encode(ENV.cookieSecret);
        const token = await new SignJWT({ purpose: "admin-codes" })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setExpirationTime(Math.floor(Date.now() / 1000) + ADMIN_CODES_SESSION_MAX_AGE)
          .sign(secret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(ADMIN_CODES_SESSION_COOKIE, token, {
          ...cookieOptions,
          maxAge: ADMIN_CODES_SESSION_MAX_AGE,
        });
        return { success: true, message: "เข้าสู่ระบบสร้างรหัสแอดมินแล้ว" };
      }),
    // สร้างรหัสแอดมิน (ต้อง verifyAccess ผ่านก่อน)
    createCode: publicProcedure.mutation(async ({ ctx }) => {
      const ok = await verifyAdminCodesSessionCookie(ctx.req.headers.cookie);
      if (!ok) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "กรุณากรอกรหัสเพื่อเข้าสู่ระบบก่อน" });
      }
      const ac = await db.createAdminCode();
      return { code: ac.code };
    }),
    // ออกจากระบบสร้างรหัส (ล้าง session)
    clearAccess: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(ADMIN_CODES_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // ============ CATEGORIES ============
  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const orgId = db.getUserOrganizationId(ctx.user);
      return db.getCategories(orgId);
    }),
    
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const orgId = ctx.user ? db.getUserOrganizationId(ctx.user) : null;
        return db.getCategoryById(input.id, orgId);
      }),
    
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          displayOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        if (!orgId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่พบข้อมูล organization",
          });
        }
        return db.createCategory({ ...input, organizationId: orgId });
      }),
    
    update: managerProcedure // Manager และ Admin แก้ไขได้
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          displayOrder: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.updateCategory(id, data, orgId);
      }),

    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        await db.deleteCategory(input.id, orgId);
        return { success: true };
      }),

    fixDuplicateIds: managerProcedure.mutation(async () => {
      return db.fixDuplicateCategoryIds();
    }),
  }),

  // ============ PRODUCTS ============
  products: router({
    list: protectedProcedure
      .input(
        z.object({
          categoryId: z.number().optional(),
          search: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getProducts({ ...input, organizationId: orgId });
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const orgId = ctx.user ? db.getUserOrganizationId(ctx.user) : null;
        return db.getProductById(input.id, orgId);
      }),

    getBySku: publicProcedure
      .input(z.object({ sku: z.string() }))
      .query(async ({ input, ctx }) => {
        const orgId = ctx.user ? db.getUserOrganizationId(ctx.user) : null;
        return db.getProductBySku(input.sku, orgId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          sku: z.string().min(1),
          name: z.string().min(1),
          description: z.string().optional(),
          categoryId: z.number(),
          price: z.string(),
          cost: z.string().optional(),
          imageUrl: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          console.log("[products.create] User:", ctx.user ? { id: ctx.user.id, email: ctx.user.email } : "null");
          if (!ctx.user) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "กรุณาเข้าสู่ระบบก่อน",
            });
          }
          const orgId = db.getUserOrganizationId(ctx.user);
          console.log("[products.create] Organization ID:", orgId);
          if (!orgId) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "ไม่พบข้อมูล organization",
            });
          }
          console.log("[products.create] Creating product with data:", { ...input, organizationId: orgId });
          const result = await db.createProduct({ ...input, organizationId: orgId });
          console.log("[products.create] Product created successfully:", result.id);
          return result;
        } catch (error) {
          console.error("[products.create] Error:", error);
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `เกิดข้อผิดพลาดในการสร้างสินค้า: ${error instanceof Error ? error.message : String(error)}`,
            cause: error,
          });
        }
      }),

    update: managerProcedure // Manager และ Admin แก้ไขได้
      .input(
        z.object({
          id: z.number(),
          sku: z.string().optional(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          categoryId: z.number().optional(),
          price: z.string().optional(),
          cost: z.string().optional(),
          imageUrl: z.string().nullable().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // ถ้ามีการเปลี่ยน SKU ให้ตรวจสอบว่า SKU ใหม่ไม่ซ้ำกับสินค้าอื่นใน organization เดียวกัน
        if (data.sku) {
          const orgId = db.getUserOrganizationId(ctx.user);
          const existingProduct = await db.getProductBySku(data.sku, orgId);
          if (existingProduct && existingProduct.id !== id) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `SKU "${data.sku}" ถูกใช้งานแล้วโดยสินค้าอื่น`,
            });
          }
        }
        
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.updateProduct(id, data, orgId);
      }),

    delete: managerProcedure // Manager และ Admin ลบได้
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        console.log("[products.delete] Attempting to delete product ID:", input.id);
        const orgId = db.getUserOrganizationId(ctx.user);
        console.log("[products.delete] Organization ID:", orgId);
        await db.deleteProduct(input.id, orgId);
        console.log("[products.delete] Product deleted successfully");
        return { success: true };
      }),
  }),

  // ============ CUSTOMERS ============
  customers: router({
    list: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
        }).optional()
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        const searchTerm = input?.search;
        return db.getCustomers(searchTerm, orgId);
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getCustomerById(input.id)),

    create: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(), // ID ที่กำหนดเอง (optional)
          name: z.string().min(1),
          phone: z.string().optional(),
          email: z.union([z.string().email(), z.literal("")]).optional(),
          address: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        console.log("[customers.create] Input:", input);
        const orgId = db.getUserOrganizationId(ctx.user);
        console.log("[customers.create] Organization ID:", orgId);
        if (!orgId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่พบข้อมูล organization",
          });
        }
        try {
          // ถ้า email เป็น empty string ให้แปลงเป็น undefined
          const email = input.email === "" ? undefined : input.email;
          
          // ถ้ามี ID ที่กำหนดมา ตรวจสอบว่าไม่ซ้ำ
          if (input.id !== undefined) {
            const existingCustomer = await db.getCustomerById(input.id, orgId);
            if (existingCustomer) {
              throw new TRPCError({
                code: "CONFLICT",
                message: `ID ${input.id} ถูกใช้งานแล้วโดยลูกค้า: ${existingCustomer.name}`,
              });
            }
          }
          
          const result = await db.createCustomer({ 
            ...input, 
            email,
            organizationId: orgId 
          });
          console.log("[customers.create] Customer created:", result.id);
          return result;
        } catch (error) {
          console.error("[customers.create] Error:", error);
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `เกิดข้อผิดพลาดในการสร้างลูกค้า: ${error instanceof Error ? error.message : String(error)}`,
            cause: error,
          });
        }
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          phone: z.string().optional(),
          email: z.union([z.string().email(), z.literal("")]).optional(),
          address: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        // ถ้า email เป็น empty string ให้แปลงเป็น undefined
        if (data.email === "") {
          data.email = undefined;
        }
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.updateCustomer(id, data, orgId);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        await db.deleteCustomer(input.id, orgId);
        return { success: true };
      }),
  }),

  // ============ TRANSACTIONS ============
  transactions: router({
    create: protectedProcedure
      .input(
        z.object({
          transactionNumber: z.string(),
          customerId: z.number().optional(),
          subtotal: z.string(),
          tax: z.string(),
          discount: z.string(),
          total: z.string(),
          paymentMethod: z.enum(["cash", "transfer", "card", "ewallet", "mixed"]),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number(),
              unitPrice: z.string(),
              discount: z.string(),
              subtotal: z.string(),
              toppings: z.array(
                z.object({
                  id: z.number(),
                  name: z.string(),
                  price: z.number(),
                })
              ).optional(), // ท็อปปิ้งที่เลือก (optional)
            })
          ),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        if (!orgId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่พบข้อมูล organization",
          });
        }
        const transaction = await db.createTransaction({
          transactionNumber: input.transactionNumber,
          cashierId: ctx.user.id,
          customerId: input.customerId,
          subtotal: input.subtotal,
          tax: input.tax,
          discount: input.discount,
          total: input.total,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          organizationId: orgId,
        });

        // Get the transaction ID from the returned transaction object
        const transactionId = (transaction as any).id;
        console.log("[transactions.create] Transaction created with ID:", transactionId);
        
        // Create transaction items
        for (const item of input.items) {
          await db.createTransactionItem({
            transactionId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            subtotal: item.subtotal,
            toppings: item.toppings || [], // ส่งท็อปปิ้งที่เลือก
          });

          // Update inventory
          const inventory = await db.getInventoryByProductId(item.productId);
          if (inventory) {
            await db.updateInventory(
              item.productId,
              inventory.quantity - item.quantity
            );
            await db.recordStockMovement({
              productId: item.productId,
              movementType: "out",
              quantity: item.quantity,
              reason: `Sale - Transaction ${input.transactionNumber}`,
              userId: ctx.user.id,
            });
          }
        }

        // สร้าง Tax Invoice อัตโนมัติถ้าร้านจด VAT
        const companyProfile = await db.getCompanyProfile(orgId);
        if (companyProfile?.vatRegistered) {
          const subtotal = parseFloat(input.subtotal || "0");
          const vat = parseFloat(input.tax || "0");
          const total = parseFloat(input.total || "0");
          
          // ดึงข้อมูลลูกค้า (ถ้ามี)
          let customerName = "ลูกค้าเงินสด";
          let customerTaxId: string | undefined;
          let customerAddress: string | undefined;
          
          if (input.customerId) {
            const customer = await db.getCustomerById(input.customerId, orgId);
            if (customer) {
              customerName = customer.name || "ลูกค้าเงินสด";
              customerTaxId = (customer as any).taxId;
              customerAddress = customer.address;
            }
          }

          // สร้างเลขที่ใบกำกับภาษี (IV + ปี + เดือน + ลำดับ)
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const invoiceSeq = await db.getNextSeq(`taxInvoices-${year}${month}`);
          const invoiceNo = `IV${year}${month}-${String(invoiceSeq).padStart(4, "0")}`;

          // สร้าง tax invoice (ใช้แบบย่อถ้าไม่มีเลขผู้เสียภาษีลูกค้า)
          const invoiceType = customerTaxId ? "full" : "abbreviated";
          
          await db.createTaxInvoice({
            invoiceNo,
            invoiceType,
            transactionId,
            date: now,
            customerName,
            customerTaxId,
            customerAddress,
            subtotal,
            vat,
            total,
          }, orgId);
        }

        if (input.customerId) {
          // เพิ่มคะแนนสะสมให้ลูกค้า
          const settings = await db.getLoyaltySettings();
          console.log("[transactions.create] ========== LOYALTY POINTS PROCESSING ==========");
          console.log("[transactions.create] Customer ID received:", input.customerId);
          console.log("[transactions.create] Customer ID type:", typeof input.customerId);
          
          // ตรวจสอบว่าลูกค้ามีอยู่จริง
          const orgId = db.getUserOrganizationId(ctx.user);
          const customer = await db.getCustomerById(input.customerId, orgId);
          if (!customer) {
            console.error("[transactions.create] ❌ Customer not found:", input.customerId);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `ลูกค้าไม่พบ (ID: ${input.customerId})`,
            });
          }
          
          console.log("[transactions.create] Customer found:", {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            currentPoints: customer.loyaltyPoints || 0
          });
          
          console.log("[transactions.create] Loyalty settings:", settings);
          
          if (settings?.isActive) {
            // คำนวณคะแนนตามการตั้งค่า
            // ถ้า pointsPerBaht = 100 หมายความว่า 100 บาทต่อ 1 คะแนน
            // สูตร: คะแนน = ยอดซื้อ / pointsPerBaht
            const pointsPerBahtRaw = settings.pointsPerBaht?.toString() || "1";
            let pointsPerBaht = parseFloat(pointsPerBahtRaw);
            
            // ถ้า pointsPerBaht เป็น 0 หรือติดลบ ให้ใช้ค่า default
            if (pointsPerBaht <= 0) {
              pointsPerBaht = 1;
            }
            
            // คะแนนควรคำนวณจากยอดรวมก่อนหักส่วนลด (subtotal) 
            // เพื่อให้ลูกค้าได้คะแนนตามยอดซื้อจริง ไม่ใช่ยอดหลังหักส่วนลด
            const subtotalAmount = parseFloat(input.subtotal || "0");
            
            console.log("[transactions.create] Transaction amounts:", {
              subtotal: input.subtotal,
              discount: input.discount,
              tax: input.tax,
              total: input.total,
              subtotalAmount,
            });
            
            // คำนวณคะแนน: ยอดซื้อ / pointsPerBaht
            // ตัวอย่าง: ถ้า pointsPerBaht = 100 และ subtotal = 250
            // คะแนน = 250 / 100 = 2.5 → Math.floor = 2 คะแนน
            const points = Math.floor(subtotalAmount / pointsPerBaht);
            
            console.log("[transactions.create] Calculating loyalty points:", {
              subtotalAmount,
              pointsPerBahtRaw,
              pointsPerBaht,
              formula: `${subtotalAmount} / ${pointsPerBaht}`,
              points,
              customerId: input.customerId,
              customerName: customer.name
            });
            
            if (points > 0) {
              console.log("[transactions.create] Calling addLoyaltyPoints for customer:", {
                customerId: input.customerId,
                customerName: customer.name,
                points
              });
              await db.addLoyaltyPoints(
                input.customerId,
                points,
                `Earned from transaction ${input.transactionNumber} (${subtotalAmount.toFixed(2)} บาท / ${pointsPerBaht} บาทต่อคะแนน)`,
                transactionId,
                orgId
              );
              console.log("[transactions.create] ✅ Loyalty points added successfully");
            } else {
              console.log("[transactions.create] ⚠️ No points to add (points = 0)");
            }
          } else {
            console.log("[transactions.create] ⚠️ Loyalty program is not active");
          }
          
          // อัปเดตยอดซื้อรวมของลูกค้า
          const currentTotalSpent = parseFloat(customer.totalSpent || "0");
          const newTotalSpent = currentTotalSpent + parseFloat(input.total || "0");
          await db.updateCustomer(input.customerId, {
            totalSpent: newTotalSpent.toFixed(2),
          }, orgId);
          console.log("[transactions.create] ✅ Customer totalSpent updated:", {
            customerId: input.customerId,
            customerName: customer.name,
            oldTotalSpent: currentTotalSpent,
            newTotalSpent
          });
          console.log("[transactions.create] ========== END LOYALTY POINTS PROCESSING ==========");
        } else {
          console.log("[transactions.create] ⚠️ No customerId provided, skipping loyalty points");
        }

        return transaction;
      }),
    
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const orgId = ctx.user ? db.getUserOrganizationId(ctx.user) : null;
        return db.getTransactionById(input.id, orgId);
      }),
    
    getByDateRange: adminProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getTransactionsByDateRange(input.startDate, input.endDate, orgId);
      }),
    
    getItems: adminProcedure
      .input(z.object({ transactionId: z.number() }))
      .query(({ input }) => db.getTransactionItems(input.transactionId)),
  }),

  // ============ INVENTORY ============
  inventory: router({
    list: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
        }).optional()
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getInventoryList(input?.search, orgId);
      }),
    
    adjustStock: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          quantity: z.number(),
          type: z.enum(["in", "out", "adjustment"]),
          reason: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.updateInventory(input.productId, input.quantity);
        return db.recordStockMovement({
          productId: input.productId,
          movementType: input.type,
          quantity: input.quantity,
          reason: input.reason,
          userId: ctx.user.id,
        });
      }),
    
    getMovementHistory: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ input }) => db.getStockMovementHistory(input.productId)),
  }),

  // ============ ACTIVITY LOGS ============
  activityLogs: router({
    list: adminProcedure
      .input(
        z.object({
          userId: z.number().optional(),
          limit: z.number().optional(),
        })
      )
      .query(({ input }) =>
        db.getActivityLogs(input.userId, input.limit ?? 100)
      ),
  }),

  // ============ REPORTS ============
  reports: router({
    salesByDateRange: adminProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        const start = new Date(input.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(input.endDate);
        end.setUTCHours(23, 59, 59, 999);
        const transactions = await db.getTransactionsByDateRange(
          start,
          end,
          orgId
        );
        const transactionIds = transactions.map((t) => t.id);
        const allItems = await db.getTransactionItemsByTransactionIds(transactionIds);
        const totalItems = allItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
        
        const totalSales = transactions.reduce(
          (sum, t) => sum + parseFloat(t.total || "0"),
          0
        );
        const totalTax = transactions.reduce(
          (sum, t) => sum + parseFloat(t.tax || "0"),
          0
        );
        const totalDiscount = transactions.reduce(
          (sum, t) => sum + parseFloat(t.discount || "0"),
          0
        );

        return {
          totalTransactions: transactions.length,
          totalItems,
          totalSales,
          totalTax,
          totalDiscount,
          transactions,
        };
      }),
    
    topProducts: adminProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        const start = new Date(input.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(input.endDate);
        end.setUTCHours(23, 59, 59, 999);
        const topProducts = await db.getTopSellingProducts(
          start,
          end,
          input.limit ?? 10,
          orgId
        );
        return topProducts;
      }),
    
    salesByPaymentMethod: adminProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        const start = new Date(input.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(input.endDate);
        end.setUTCHours(23, 59, 59, 999);
        const transactions = await db.getTransactionsByDateRange(
          start,
          end,
          orgId
        );
        
        const paymentMethods: Record<string, { count: number; total: number }> = {};
        
        transactions.forEach((t) => {
          const method = t.paymentMethod || "unknown";
          if (!paymentMethods[method]) {
            paymentMethods[method] = { count: 0, total: 0 };
          }
          paymentMethods[method].count += 1;
          paymentMethods[method].total += parseFloat(t.total || "0");
        });

        return paymentMethods;
      }),
    
    dailySales: adminProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        const start = new Date(input.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(input.endDate);
        end.setUTCHours(23, 59, 59, 999);
        const transactions = await db.getTransactionsByDateRange(
          start,
          end,
          orgId
        );
        
        const dailySales: Record<string, { count: number; total: number }> = {};
        
        transactions.forEach((t) => {
          const date = new Date(t.createdAt).toISOString().split("T")[0];
          if (!dailySales[date]) {
            dailySales[date] = { count: 0, total: 0 };
          }
          dailySales[date].count += 1;
          dailySales[date].total += parseFloat(t.total || "0");
        });

        return dailySales;
      }),
    
    exportSalesReport: adminProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
          format: z.enum(["pdf", "excel"]),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        const start = new Date(input.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(input.endDate);
        end.setUTCHours(23, 59, 59, 999);
        const transactions = await db.getTransactionsByDateRange(
          start,
          end,
          orgId
        );
        
        const totalSales = transactions.reduce(
          (sum, t) => sum + parseFloat(t.total || "0"),
          0
        );
        const totalTax = transactions.reduce(
          (sum, t) => sum + parseFloat(t.tax || "0"),
          0
        );
        const totalDiscount = transactions.reduce(
          (sum, t) => sum + parseFloat(t.discount || "0"),
          0
        );

        const reportData = {
          startDate: input.startDate,
          endDate: input.endDate,
          totalTransactions: transactions.length,
          totalSales,
          totalTax,
          totalDiscount,
          transactions,
          format: input.format,
        };

        return reportData;
      }),

    /**
     * ประวัติการขายแยกตามพนักงาน – ดูได้ว่าสินค้า/อาหารแต่ละชิ้น พนักงานคนไหนเป็นคนขาย
     * ใช้ cashierId ของ transaction (พนักงานที่กดชำระเงิน = คนขายทั้งบิล)
     */
    salesAudit: adminProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
          cashierId: z.number().optional(),
          productId: z.number().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        if (!orgId) return { rows: [] };

        const start = new Date(input.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(input.endDate);
        end.setUTCHours(23, 59, 59, 999);
        let transactions = await db.getTransactionsByDateRange(
          start,
          end,
          orgId
        );

        if (input.cashierId != null) {
          transactions = transactions.filter(
            (t) => parseInt(String(t.cashierId), 10) === input.cashierId
          );
        }

        const cashierIds = Array.from(new Set(transactions.map((t) => String(t.cashierId))));
        const cashierMap: Record<string, string> = {};
        for (const idStr of cashierIds) {
          const u = await db.getUserById(parseInt(idStr, 10), orgId);
          cashierMap[idStr] = u?.name ?? `ID: ${idStr}`;
        }

        const allItems: Array<{
          transactionId: number;
          transactionNumber: string;
          createdAt: Date;
          cashierId: string;
          productId: number;
          quantity: number;
          unitPrice: string;
          subtotal: string;
        }> = [];

        for (const t of transactions) {
          const items = await db.getTransactionItems(t.id);
          for (const item of items) {
            if (
              input.productId != null &&
              Number(item.productId) !== input.productId
            )
              continue;
            allItems.push({
              transactionId: t.id,
              transactionNumber: t.transactionNumber ?? "",
              createdAt: t.createdAt,
              cashierId: String(t.cashierId),
              productId: Number(item.productId),
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? "0",
              subtotal: item.subtotal ?? "0",
            });
          }
        }

        const productIds = Array.from(new Set(allItems.map((i) => i.productId)));
        const productMap: Record<number, string> = {};
        for (const id of productIds) {
          const p = await db.getProductById(id, orgId);
          productMap[id] = p?.name ?? `#${id}`;
        }

        const rows = allItems
          .map((i) => ({
            transactionId: i.transactionId,
            transactionNumber: i.transactionNumber,
            createdAt: i.createdAt,
            productId: i.productId,
            productName: productMap[i.productId] ?? `#${i.productId}`,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
            cashierId: i.cashierId,
            cashierName: cashierMap[i.cashierId] ?? "-",
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

        return { rows };
      }),
  }),

  // ============ DISCOUNTS ============
  discounts: router({
    list: managerProcedure.query(async ({ ctx }) => { // Manager และ Admin ดูได้
      const orgId = db.getUserOrganizationId(ctx.user);
      return db.getDiscounts(orgId);
    }),
    
    active: publicProcedure.query(async ({ ctx }) => {
      const orgId = ctx.user ? db.getUserOrganizationId(ctx.user) : null;
      return db.getActiveDiscounts(orgId);
    }),
    
    create: managerProcedure // Manager และ Admin สร้างได้
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          type: z.enum(["percentage", "fixed_amount", "product_specific", "bill_total"]),
          value: z.string(),
          productId: z.string().optional(),
          minBillAmount: z.string().optional(),
          maxDiscountAmount: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          autoApply: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        if (!orgId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่พบข้อมูล organization",
          });
        }
        return db.createDiscount({ ...input, organizationId: orgId });
      }),
    
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          type: z.enum(["percentage", "fixed_amount", "product_specific", "bill_total"]).optional(),
          value: z.string().optional(),
          productId: z.string().optional(),
          minBillAmount: z.string().optional(),
          maxDiscountAmount: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          autoApply: z.boolean().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateDiscount(id, data);
      }),
    
    delete: managerProcedure // Manager และ Admin ลบได้
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteDiscount(input.id)),
  }),

  // ============ LOYALTY PROGRAM ============
  loyalty: router({
    addPoints: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          points: z.number(),
          description: z.string().optional(),
          transactionId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.addLoyaltyPoints(input.customerId, input.points, input.description, input.transactionId, orgId);
      }),
    
    redeemPoints: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          points: z.number(),
          description: z.string().optional(),
        })
      )
      .mutation(({ input }) => db.redeemLoyaltyPoints(input.customerId, input.points, input.description)),
    
    getHistory: adminProcedure
      .input(z.object({ customerId: z.number() }))
      .query(({ input }) => db.getLoyaltyTransactionHistory(input.customerId)),
    
    getSettings: adminProcedure.query(() => db.getLoyaltySettings()),
    
    updateSettings: adminProcedure
      .input(
        z.object({
          pointsPerBaht: z.string().optional(),
          pointValue: z.string().optional(),
          pointExpirationDays: z.number().optional(),
          minPointsToRedeem: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => db.updateLoyaltySettings(input)),
  }),

  users: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const orgId = db.getUserOrganizationId(ctx.user);
      return db.getUsers(orgId);
    }),
    
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getUserById(input.id, orgId);
      }),
    
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().optional(),
          role: z.enum(["admin", "manager", "cashier"]),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        if (!orgId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "ไม่พบข้อมูลร้าน",
          });
        }
        if (!ctx.user.storeId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "กรุณาเชื่อมต่อร้านก่อน จึงจะเพิ่มผู้ใช้งานได้",
          });
        }
        return db.createUser(input, orgId, ctx.user.id, ctx.user.storeId);
      }),
    
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          role: z.enum(["admin", "manager", "cashier"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.updateUser(input.id, input, orgId);
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        await db.deleteUser(input.id, orgId);
        return { success: true };
      }),
  }),

  // ============ EMAIL NOTIFICATIONS ============
  email: router({
    testConnection: adminProcedure.mutation(() => testEmailConnection()),

    sendDailySalesReport: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          date: z.string(),
          totalSales: z.number(),
          totalTransactions: z.number(),
          averageTransaction: z.number(),
          topProducts: z.array(
            z.object({
              name: z.string(),
              quantity: z.number(),
              revenue: z.number(),
            })
          ),
        })
      )
      .mutation(({ input }) =>
        sendDailySalesReport(input.email, {
          date: input.date,
          totalSales: input.totalSales,
          totalTransactions: input.totalTransactions,
          averageTransaction: input.averageTransaction,
          topProducts: input.topProducts,
        })
      ),

    sendLowStockAlert: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          products: z.array(
            z.object({
              name: z.string(),
              currentStock: z.number(),
              minimumThreshold: z.number(),
            })
          ),
        })
      )
      .mutation(({ input }) =>
        sendLowStockAlert(input.email, { products: input.products })
      ),
  }),

  receiptTemplates: router({
    list: publicProcedure.query(() => db.getReceiptTemplates()),
    
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getReceiptTemplate(input.id)),
    
    getDefault: publicProcedure.query(() => db.getDefaultReceiptTemplate()),
    
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          headerText: z.string().optional(),
          footerText: z.string().optional(),
          showCompanyName: z.boolean().optional(),
          showDate: z.boolean().optional(),
          showTime: z.boolean().optional(),
          showCashier: z.boolean().optional(),
          showTransactionId: z.boolean().optional(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => db.createReceiptTemplate(input)),
    
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          headerText: z.string().optional(),
          footerText: z.string().optional(),
          showCompanyName: z.boolean().optional(),
          showDate: z.boolean().optional(),
          showTime: z.boolean().optional(),
          showCashier: z.boolean().optional(),
          showTransactionId: z.boolean().optional(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateReceiptTemplate(id, data);
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteReceiptTemplate(input.id)),
  }),

  // ============ DISCOUNT CODES ============
  discountCodes: router({
    create: adminProcedure
      .input(
        z.object({
          code: z.string().min(1).max(50),
          discountId: z.number(),
          maxUsageCount: z.number().min(1),
          description: z.string().optional(),
          endDate: z.date().optional(),
        })
      )
      .mutation(({ input }) => db.createDiscountCode(input)),
    
    validate: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const code = await db.validateDiscountCode(input.code);
        if (!code) return null;
        const discount = await db.getDiscountById(code.discountId);
        if (!discount || !discount.isActive) return null;
        const now = new Date();
        if (discount.startDate && new Date(discount.startDate) > now) return null;
        if (discount.endDate && new Date(discount.endDate) < now) return null;
        return { code, discount };
      }),
    
    incrementUsage: protectedProcedure
      .input(z.object({ codeId: z.number() }))
      .mutation(({ input }) => db.incrementDiscountCodeUsage(input.codeId)),
    
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getDiscountCodeById(input.id)),
    
    list: adminProcedure
      .input(
        z.object({
          isActive: z.boolean().optional(),
          discountId: z.number().optional(),
        })
      )
      .query(({ input }) => db.listDiscountCodes(input)),
    
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          isActive: z.boolean().optional(),
          maxUsageCount: z.number().optional(),
          endDate: z.date().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateDiscountCode(id, data);
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteDiscountCode(input.id)),
  }),

  // ============ DASHBOARD ============
  dashboard: router({
    discountCodeStats: protectedProcedure
      .query(() => db.getDiscountCodeStatistics()),
    
    topDiscountCodes: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input }) => db.getTopDiscountCodes(input.limit)),
    
    summary: protectedProcedure
      .query(async ({ ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getDashboardSummary(orgId);
      }),
    
    recentActivities: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input }) => db.getRecentActivities(input.limit)),
  }),

  // ============ TAX SYSTEM (ระบบภาษี) ============
  tax: router({
    // Company Profile
    getCompanyProfile: protectedProcedure.query(async ({ ctx }) => {
      const orgId = db.getUserOrganizationId(ctx.user);
      return db.getCompanyProfile(orgId);
    }),
    
    updateCompanyProfile: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          taxId: z.string().length(13),
          address: z.string().min(1),
          district: z.string().optional(),
          province: z.string().optional(),
          postalCode: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          businessType: z.string().optional(),
          vatRegistered: z.boolean(),
          vatNumber: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        if (!orgId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่พบข้อมูล organization",
          });
        }
        return db.upsertCompanyProfile(input, orgId);
      }),

    // Tax Invoices
    getTaxInvoice: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getTaxInvoiceById(input.id, orgId);
      }),

    getTaxInvoiceByTransaction: protectedProcedure
      .input(z.object({ transactionId: z.number() }))
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getTaxInvoiceByTransactionId(input.transactionId, orgId);
      }),

    getTaxInvoicesByDateRange: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getTaxInvoicesByDateRange(input.startDate, input.endDate, orgId);
      }),

    cancelTaxInvoice: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.cancelTaxInvoice(input.id, orgId);
      }),

    // VAT Reports
    getVatReport: protectedProcedure
      .input(z.object({ month: z.string() }))
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getVatReport(input.month, orgId);
      }),

    getVatReportsByYear: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getVatReportsByYear(input.year, orgId);
      }),

    generateVatReport: adminProcedure
      .input(
        z.object({
          month: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // คำนวณ VAT จาก transactions และ tax invoices ในเดือนนั้น
        const [year, monthNum] = input.month.split("-").map(Number);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59);
        
        const orgId = db.getUserOrganizationId(ctx.user);

        // VAT ขาย (จาก Tax Invoices)
        const invoices = await db.getTaxInvoicesByDateRange(startDate, endDate, orgId);
        const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
        const vatSales = invoices.reduce((sum, inv) => sum + inv.vat, 0);

        // VAT ซื้อ (จาก Purchase Invoices)
        const purchaseInvoices = await db.getPurchaseInvoicesByDateRange(startDate, endDate, orgId);
        const vatBuy = purchaseInvoices.reduce((sum, inv) => sum + inv.vat, 0);

        return db.createOrUpdateVatReport({
          month: input.month,
          totalSales,
          vatSales,
          vatBuy,
        }, orgId!);
      }),

    submitVatReport: adminProcedure
      .input(z.object({ month: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.submitVatReport(input.month, orgId);
      }),

    // Withholding Tax
    createWithholdingTax: adminProcedure
      .input(
        z.object({
          documentNo: z.string(),
          documentType: z.enum(["pnd3", "pnd53"]),
          payeeName: z.string().min(1),
          payeeTaxId: z.string(),
          payeeAddress: z.string().optional(),
          paymentDate: z.date(),
          paymentType: z.enum(["service", "rent", "freelance", "other"]),
          paymentAmount: z.number().positive(),
          withholdingRate: z.number().min(0).max(100),
        })
      )
      .mutation(({ input }) => db.createWithholdingTax(input)),

    getWithholdingTax: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getWithholdingTaxById(input.id)),

    getWithholdingTaxesByDateRange: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(({ input }) =>
        db.getWithholdingTaxesByDateRange(input.startDate, input.endDate)
      ),

    getWithholdingTaxesByType: protectedProcedure
      .input(
        z.object({
          documentType: z.enum(["pnd3", "pnd53"]),
          year: z.number(),
        })
      )
      .query(({ input }) =>
        db.getWithholdingTaxesByType(input.documentType, input.year)
      ),

    // Annual Income Summary
    getAnnualIncomeSummary: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(({ input }) => db.getAnnualIncomeSummary(input.year)),

    generateAnnualIncomeSummary: adminProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // คำนวณรายได้และค่าใช้จ่ายจาก transactions ทั้งปี
        const startDate = new Date(input.year, 0, 1);
        const endDate = new Date(input.year, 11, 31, 23, 59, 59);

        const orgId = db.getUserOrganizationId(ctx.user);
        const transactions = await db.getTransactionsByDateRange(startDate, endDate, orgId);
        const totalRevenue = transactions.reduce(
          (sum, t) => sum + parseFloat(t.total || "0"),
          0
        );

        // TODO: คำนวณต้นทุนและค่าใช้จ่ายจาก inventory และ expenses
        const totalCost = 0;
        const totalExpenses = 0;

        return db.createOrUpdateAnnualIncomeSummary({
          year: input.year,
          totalRevenue,
          totalCost,
          totalExpenses,
        });
      }),

    finalizeAnnualIncomeSummary: adminProcedure
      .input(z.object({ year: z.number() }))
      .mutation(({ input }) => db.finalizeAnnualIncomeSummary(input.year)),
  }),

  // ============ PURCHASE INVOICES (ใบรับซื้อ) ============
  purchaseInvoices: router({
    create: adminProcedure
      .input(
        z.object({
          invoiceNo: z.string(),
          supplierName: z.string().min(1),
          supplierTaxId: z.string().optional(),
          supplierAddress: z.string().optional(),
          date: z.date(),
          subtotal: z.number(),
          vat: z.number(),
          total: z.number(),
          items: z.array(
            z.object({
              description: z.string(),
              quantity: z.number(),
              unitPrice: z.number(),
              amount: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        if (!orgId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่พบข้อมูล organization",
          });
        }
        return db.createPurchaseInvoice(input, orgId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getPurchaseInvoiceById(input.id, orgId);
      }),

    getByDateRange: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.getPurchaseInvoicesByDateRange(input.startDate, input.endDate, orgId);
      }),

    cancel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        return db.cancelPurchaseInvoice(input.id, orgId);
      }),
  }),

  // ============ TOPPINGS ============
  toppings: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const orgId = db.getUserOrganizationId(ctx.user);
      return db.getToppings(orgId);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getToppingById(input.id)),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          price: z.number().min(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const orgId = db.getUserOrganizationId(ctx.user);
        if (!orgId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่พบข้อมูล organization",
          });
        }
        return db.createTopping({
          name: input.name,
          price: input.price,
          organizationId: orgId,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          price: z.number().min(0).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateTopping(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTopping(input.id);
        return { success: true };
      }),
  }),

  // ============ STORES (ห้องร้าน) ============
  stores: router({
    // หัวหน้าสร้างร้านใหม่
    create: adminProcedure
      .input(
        z.object({
          storeCode: z.string().min(1),
          name: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createStore({
          storeCode: input.storeCode,
          name: input.name,
          ownerId: ctx.user.id,
        });
      }),

    // ดึงร้านทั้งหมดของหัวหน้า
    list: adminProcedure.query(async ({ ctx }) => {
      return db.getStoresByOwner(ctx.user.id);
    }),

    // ดึงร้านตาม ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getStoreById(input.id)),

    // สร้างรหัสเข้าร้าน
    createInvite: adminProcedure
      .input(
        z.object({
          storeId: z.number(),
          code: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createStoreInvite({
          code: input.code,
          storeId: input.storeId,
          createdBy: ctx.user.id,
        });
      }),

    // ดึงรหัสเข้าร้านทั้งหมดของร้าน
    getInvites: adminProcedure
      .input(z.object({ storeId: z.number() }))
      .query(({ input }) => db.getStoreInvitesByStore(input.storeId)),

    // อัปเดตสถานะรหัสเข้าร้าน
    updateInvite: adminProcedure
      .input(
        z.object({
          id: z.number(),
          active: z.boolean(),
        })
      )
      .mutation(({ input }) => db.updateStoreInvite(input.id, input.active)),

    // พนักงานเข้าร้าน (กรอกรหัส)
    join: protectedProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        // หารหัสเข้าร้าน
        const invite = await db.getStoreInviteByCode(input.code);
        if (!invite) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "รหัสเข้าร้านไม่ถูกต้องหรือหมดอายุ",
          });
        }

        // ตรวจสอบว่าร้านมีอยู่จริง
        const store = await db.getStoreById(invite.storeId);
        if (!store) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบร้านที่ระบุ",
          });
        }

        // อัปเดต storeId และ organizationId (owner ของร้าน) ของ user
        await db.joinStore(ctx.user.id, invite.storeId, store.ownerId);

        return {
          success: true,
          storeId: store.id,
          storeName: store.name,
          message: `เข้าร้าน "${store.name}" สำเร็จ`,
        };
      }),

    // พนักงานออกจากร้าน
    leave: protectedProcedure.mutation(async ({ ctx }) => {
      await db.leaveStore(ctx.user.id);
      return { success: true, message: "ออกจากร้านสำเร็จ" };
    }),

    // ดึงผู้ใช้ทั้งหมดในร้าน (สำหรับหัวหน้า)
    getUsers: adminProcedure
      .input(z.object({ storeId: z.number() }))
      .query(({ input }) => db.getUsersByStore(input.storeId)),
  }),
});

export type AppRouter = typeof appRouter;
