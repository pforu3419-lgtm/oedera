import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

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
