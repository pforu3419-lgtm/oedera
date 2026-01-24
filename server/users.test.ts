import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    phone: "0812345678",
    loginMethod: "manus",
    role: "admin",
    organizationId: null,
    storeId: 1,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as AuthenticatedUser;

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

  return { ctx };
}

describe("users", () => {
  it("should list users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a new user", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.create({
      name: "Test User",
      email: "test@example.com",
      phone: "0898765432",
      role: "cashier",
      password: "password123",
    });

    expect(result).toBeDefined();
  });

  it("should update a user", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.update({
      id: 1,
      name: "Updated User",
      email: "updated@example.com",
      role: "manager",
    });

    expect(result).toBeDefined();
  });

  it("should delete a user", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.delete({ id: 999 });
    expect(result).toBeDefined();
  });
});
