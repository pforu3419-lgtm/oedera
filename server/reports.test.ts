import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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

describe("reports router", () => {
  describe("salesByDateRange", () => {
    it("should return sales data for date range", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const startDate = new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = new Date();

      const result = await caller.reports.salesByDateRange({
        startDate,
        endDate,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalTransactions");
      expect(result).toHaveProperty("totalSales");
      expect(result).toHaveProperty("totalTax");
      expect(result).toHaveProperty("totalDiscount");
      expect(result).toHaveProperty("transactions");
    });
  });

  describe("topProducts", () => {
    it("should return top selling products", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const startDate = new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = new Date();

      const result = await caller.reports.topProducts({
        startDate,
        endDate,
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("salesByPaymentMethod", () => {
    it("should return sales by payment method", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const startDate = new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = new Date();

      const result = await caller.reports.salesByPaymentMethod({
        startDate,
        endDate,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });
  });

  describe("dailySales", () => {
    it("should return daily sales data", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const startDate = new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = new Date();

      const result = await caller.reports.dailySales({
        startDate,
        endDate,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });
  });
});
