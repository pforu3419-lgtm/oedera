import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getUserByOpenId, upsertUser } from "../db";

export type AppUser = User & {
  storeId?: number | null;
  organizationId?: number | null;
  createdBy?: number | null;
};

const DEV_GUEST_OPEN_ID = "dev_guest";
let devGuestUser: AppUser | null = null;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AppUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: AppUser | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  const devGuestDisabled =
    typeof opts.req.headers["x-dev-guest"] === "string" &&
    opts.req.headers["x-dev-guest"].toLowerCase() === "off";
  if (!user && process.env.NODE_ENV === "development" && !devGuestDisabled) {
    if (!devGuestUser) {
      try {
        const existing = await getUserByOpenId(DEV_GUEST_OPEN_ID);
        if (!existing) {
          await upsertUser({
            openId: DEV_GUEST_OPEN_ID,
            name: "Guest",
            email: "guest@example.com",
            role: "admin",
            loginMethod: "dev-guest",
            lastSignedIn: new Date(),
          });
        }
        devGuestUser =
          (await getUserByOpenId(DEV_GUEST_OPEN_ID)) ??
          ({
            id: 0,
            openId: DEV_GUEST_OPEN_ID,
            name: "Guest",
            email: "guest@example.com",
            phone: null,
            loginMethod: "dev-guest",
            passwordHash: null,
            passwordSalt: null,
            role: "admin",
            storeId: 1,
            organizationId: null,
            createdBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          } as AppUser);
      } catch (error) {
        devGuestUser = {
          id: 0,
          openId: DEV_GUEST_OPEN_ID,
          name: "Guest",
          email: "guest@example.com",
          phone: null,
          loginMethod: "dev-guest",
          passwordHash: null,
          passwordSalt: null,
          role: "admin",
          storeId: 1,
          organizationId: null,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as AppUser;
      }
    }
    user = devGuestUser;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
