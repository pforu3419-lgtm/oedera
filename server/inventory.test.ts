import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("inventory router", () => {
  describe("list", () => {
    it("should return inventory list", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.inventory.list({ search: "" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("adjustStock", () => {
    it("should allow admin to adjust stock", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.inventory.adjustStock({
        productId: 1,
        quantity: 10,
        type: "in",
        reason: "Test stock adjustment",
      });

      expect(result).toBeDefined();
    });
  });

  describe("getMovementHistory", () => {
    it("should return stock movement history", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.inventory.getMovementHistory({
        productId: 1,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
