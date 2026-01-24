import { describe, expect, it, beforeAll, afterAll } from "vitest";
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

function createCashierContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "cashier-user",
    email: "cashier@example.com",
    name: "Cashier User",
    loginMethod: "manus",
    role: "cashier",
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

describe("products router", () => {
  describe("list", () => {
    it("should return products list", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.products.list({});
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter products by status", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.products.list({ status: "active" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("create", () => {
    it("should allow admin to create product", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.products.create({
        sku: `TEST-${Date.now()}`,
        name: "Test Product",
        categoryId: 1,
        price: "100.00",
        cost: "50.00",
      });

      expect(result).toBeDefined();
    });

    it("should not allow cashier to create product", async () => {
      const ctx = createCashierContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.products.create({
          sku: `TEST-${Date.now()}-2`,
          name: "Test Product 2",
          categoryId: 1,
          price: "100.00",
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("delete", () => {
    it("should not allow cashier to delete product", async () => {
      const ctx = createCashierContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.products.delete({ id: 1 });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });
});
