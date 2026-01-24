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

describe("discounts router", () => {
  it("should list all discounts", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.discounts.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should get active discounts", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.discounts.active();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a discount", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.discounts.create({
      name: "Test Discount",
      description: "Test discount description",
      type: "percentage",
      value: "20",
    });

    expect(result).toBeDefined();
  });

  it("should update a discount", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a discount first
    const created = await caller.discounts.create({
      name: "Test Discount",
      type: "percentage",
      value: "20",
    });

    // Update it
    const result = await caller.discounts.update({
      id: 1,
      name: "Updated Discount",
      value: "25",
    });

    expect(result).toBeDefined();
  });

  it("should delete a discount", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.discounts.delete({ id: 1 });

    expect(result).toBeDefined();
  });
});
