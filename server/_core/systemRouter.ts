import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /** ดูว่าตั้งรหัสหลักสำหรับหน้าสร้างรหัสแอดมินใน DB หรือยัง (ไม่ส่งค่าจริง) */
  getMasterCodeForAdminCodesConfig: adminProcedure.query(() => db.getMasterCodeForAdminCodesConfig()),

  /** ตั้ง/เปลี่ยนรหัสหลักสำหรับเข้าหน้าสร้างรหัสแอดมิน (เก็บใน DB) */
  setMasterCodeForAdminCodes: adminProcedure
    .input(z.object({ code: z.string().min(8, "รหัสต้องมีอย่างน้อย 8 ตัวอักษร") }))
    .mutation(async ({ input }) => {
      await db.setMasterCodeForAdminCodes(input.code);
      return { success: true };
    }),
});
