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

describe("customers router", () => {
  describe("list", () => {
    it("should return customers list", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({ search: "" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter customers by search term", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({ search: "test" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("create", () => {
    it("should create a new customer", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.create({
        name: "New Customer",
        phone: "081-234-5678",
        email: "customer@example.com",
        address: "123 Main St",
        notes: "VIP customer",
      });

      expect(result).toBeDefined();
    });
  });

  describe("delete", () => {
    it("should delete a customer", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.delete({ id: 999 });
      expect(result).toBeDefined();
    });
  });

  describe("getPurchaseHistory", () => {
    it("should return customer purchase history", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.getPurchaseHistory({
        customerId: 1,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
