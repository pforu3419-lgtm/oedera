import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createProtectedContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
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

describe("loyalty router", () => {
  it("should get loyalty settings", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.loyalty.getSettings();

    expect(result === null || typeof result === "object").toBe(true);
  });

  it("should update loyalty settings as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.loyalty.updateSettings({
      pointsPerBaht: "1",
      pointValue: "1",
      minPointsToRedeem: 100,
      isActive: true,
    });

    expect(result).toBeDefined();
  });

  it("should add loyalty points", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.loyalty.addPoints({
      customerId: 1,
      points: 100,
      description: "Test points",
    });

    expect(result).toBeDefined();
  });

  it("should redeem loyalty points", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.loyalty.redeemPoints({
      customerId: 1,
      points: 50,
      description: "Test redemption",
    });

    expect(result).toBeDefined();
  });

  it("should get loyalty transaction history", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.loyalty.getHistory({
      customerId: 1,
    });

    expect(Array.isArray(result)).toBe(true);
  });
});
