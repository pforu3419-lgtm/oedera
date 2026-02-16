import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";
import * as db from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

function isSuperAdmin(user: { role?: string | null; email?: string | null } | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  const raw = (ENV.superAdminEmails || "").trim();
  if (!raw) return false;
  const email = (user.email || "").trim().toLowerCase();
  if (!email) return false;
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return set.has(email);
}

// Admin only - เฉพาะ admin เท่านั้น
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Super Admin only — คุมทั้งระบบ (Subscription / ร้านทั้งหมด)
export const superAdminProcedure = protectedProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!isSuperAdmin(ctx.user)) {
      // Fallback: ถ้า token ยังเป็น role เก่า แต่ใน DB ถูก set เป็น superadmin แล้ว ให้ผ่านได้
      // (ช่วยตอนเพิ่งอัปเดต role แล้วผู้ใช้ยังไม่ logout/login)
      const openId = (ctx.user as any)?.openId;
      if (!openId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ต้องเป็น Super Admin เท่านั้น" });
      }
      const row = await db.getUserByOpenId(String(openId));
      if (row?.role !== "superadmin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "ต้องเป็น Super Admin เท่านั้น" });
      }
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// POS access guard — ให้ Login ได้ แต่กันการใช้งาน POS เมื่อร้าน pending/expired/disabled
export const posProcedure = protectedProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    // throw TRPCError(FORBIDDEN) พร้อมข้อความตามสถานะร้าน
    await db.assertPosAccessForUser(ctx.user);
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Manager or Admin - admin และ manager เรียกได้
export const managerProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'manager')) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "ต้องเป็น admin หรือ manager เท่านั้น" 
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ประวัติการขาย: Admin/Manager ดูทั้งหมด, Cashier ดูเฉพาะบิลของตัวเอง
export const reportsProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" });
    }
    const role = ctx.user.role;
    const allowed = role === "admin" || role === "manager" || role === "cashier";
    if (!allowed) {
      throw new TRPCError({ code: "FORBIDDEN", message: "ไม่มีสิทธิ์ดูประวัติการขาย" });
    }
    const reportRestrictCashierId = role === "cashier" ? ctx.user.id : undefined;
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        reportRestrictCashierId,
      },
    });
  }),
);
