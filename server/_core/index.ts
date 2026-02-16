import express from "express";
import { createServer } from "http";
import net from "net";
import os from "node:os";
import fileUpload from "express-fileupload";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storagePut } from "../storage";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
// Import ENV first - it will load dotenv automatically
import "./env";
import { sdk } from "./sdk";
import {
  createInternalUser,
  getUserByEmail,
  updateUserPasswordByEmail,
  updateUserRoleByEmail,
  upsertUser,
  getUserOrganizationId,
  getUserById,
  getUserByOpenId,
} from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  try {
    console.log("🚀 Starting server...");
    console.log(`[ENV] NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
    console.log(`[ENV] PORT: ${process.env.PORT || "3000 (default)"}`);
    
    const app = express();
    const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Configure file upload middleware
  app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    abortOnLimit: true,
    responseOnLimit: "File size limit exceeded (max 10MB)",
  }));

  // Public helper: return LAN IPv4 for QR base URL (so mobile can open it)
  // NOTE: This does not change any POS logic. It's just to help generate a reachable URL instead of localhost.
  app.get("/api/public/lan-ip", (req, res) => {
    try {
      const ifaces = os.networkInterfaces();
      const ips: string[] = [];
      for (const name of Object.keys(ifaces)) {
        const list = ifaces[name] || [];
        for (const info of list) {
          if (!info) continue;
          // Node returns family as string in most versions; sometimes number. Handle both.
          const isV4 =
            info.family === "IPv4" || (typeof info.family === "number" && info.family === 4);
          if (!isV4) continue;
          if ((info as any).internal) continue;
          const addr = String((info as any).address || "").trim();
          if (!addr) continue;
          ips.push(addr);
        }
      }
      const host = req.get("host") || "";
      const port = host.includes(":") ? host.split(":").pop() : "";
      return res.json({
        ok: true,
        ips,
        // best guess for the first usable IPv4 (most common for LAN)
        ip: ips[0] || null,
        port: port || null,
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  });

  if (process.env.NODE_ENV === "development") {
    const baseTestUsers = new Map<
      string,
      {
        role: "admin" | "manager" | "cashier";
        openId: string;
        name: string;
        email: string;
      }
    >([
      [
        "HEAD-TEST-001",
        {
          role: "manager",
          openId: "dev_head_001",
          name: "Head Test",
          email: "head.test@example.com",
        },
      ],
      [
        "STAFF-TEST-001",
        {
          role: "cashier",
          openId: "dev_staff_001",
          name: "Staff Test",
          email: "staff.test@example.com",
        },
      ],
    ]);
    const invitedCodes = new Map<
      string,
      {
        role: "cashier";
        openId: string;
        name: string;
        email: string;
      }
    >();

    app.get("/api/dev/login", async (req, res) => {
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({
          error:
            "JWT_SECRET is not configured. Set JWT_SECRET to enable dev login.",
        });
      }
      const code =
        typeof req.query.code === "string" ? req.query.code.trim() : "";
      const roleParam =
        typeof req.query.role === "string"
          ? req.query.role.toLowerCase()
          : "";

      const fromInvite = code ? invitedCodes.get(code) : undefined;
      const fromBase = code ? baseTestUsers.get(code) : undefined;
      let userInfo:
        | {
            role: "admin" | "manager" | "cashier";
            openId: string;
            name: string;
            email: string;
          }
        | undefined = fromInvite ?? fromBase;

      if (!userInfo && roleParam) {
        const allowedRoles = ["admin", "manager", "cashier"];
        if (!allowedRoles.includes(roleParam)) {
          return res.status(400).json({
            error: "Invalid role. Use role=admin|manager|cashier",
          });
        }
        userInfo = {
          role: roleParam as "admin" | "manager" | "cashier",
          openId: `dev_${roleParam}`,
          name:
            roleParam === "manager"
              ? "Test Manager"
              : roleParam === "admin"
                ? "Test Admin"
                : "Test Cashier",
          email: `test+${roleParam}@example.com`,
        };
      }

      if (!userInfo) {
        return res.status(400).json({
          error:
            "Missing or invalid code. Use code=HEAD-TEST-001 or STAFF-TEST-001",
        });
      }

      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email,
        role: userInfo.role,
        loginMethod: "dev",
        lastSignedIn: new Date(),
      });

      // ดึง user จาก DB เพื่อให้ได้ role ที่ถูกต้อง
      const user = await getUserByOpenId(userInfo.openId);
      const userRole = user?.role || userInfo.role;

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name,
        role: userRole, // ส่ง role เข้าไปใน token
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: ONE_YEAR_MS,
      });
      return res.json({
        ok: true,
        role: userRole, // ส่ง role กลับไปใน response
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email,
        redirect: "/",
      });
    });

    app.get("/api/dev/invite", async (req, res) => {
      const ownerCode =
        typeof req.query.code === "string" ? req.query.code.trim() : "";
      if (ownerCode !== "HEAD-TEST-001") {
        return res.status(403).json({
          error: "Invalid owner code. Use code=HEAD-TEST-001",
        });
      }

      const now = Date.now();
      const inviteCode = `TRIAL-${now}`;
      const userInfo = {
        role: "cashier" as const,
        openId: `dev_trial_${now}`,
        name: `Trial User ${now}`,
        email: `trial.${now}@example.com`,
      };
      invitedCodes.set(inviteCode, userInfo);

      return res.json({
        ok: true,
        code: inviteCode,
        role: userInfo.role,
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email,
        loginUrl: `/api/dev/login?code=${inviteCode}`,
      });
    });

    app.get("/api/dev/logout", (_req, res) => {
      res.clearCookie(COOKIE_NAME);
      return res.json({ ok: true });
    });

    app.get("/api/dev/seed-users", async (_req, res) => {
      try {
        console.log("[seed-users] Starting seed process...");
        const users = [
          {
            name: "หัวหน้า",
            email: "head@ordera.local",
            password: "Head1234!",
            role: "manager" as const,
          },
          {
            name: "พนักงาน",
            email: "staff@ordera.local",
            password: "Staff1234!",
            role: "cashier" as const,
          },
        ];

        const created = [];
        for (const user of users) {
          try {
            console.log(`[seed-users] Processing user: ${user.email}`);
            const existing = await getUserByEmail(user.email);
            if (existing) {
              console.log(`[seed-users] User exists, updating password: ${user.email}`);
              await updateUserPasswordByEmail(user.email, user.password);
              await updateUserRoleByEmail(user.email, user.role);
              created.push({ ...user, status: "updated" as const });
              console.log(`[seed-users] Updated user: ${user.email}`);
            } else {
              console.log(`[seed-users] Creating new user: ${user.email}`);
              await createInternalUser(user);
              created.push({ ...user, status: "created" as const });
              console.log(`[seed-users] Created user: ${user.email}`);
            }
          } catch (error) {
            console.error(`[seed-users] Error processing ${user.email}:`, error);
            created.push({ ...user, status: "error", error: error instanceof Error ? error.message : "Unknown error" });
          }
        }

        console.log("[seed-users] Seed process completed:", created);
        return res.json({ ok: true, users: created });
      } catch (error) {
        console.error("[seed-users] Fatal error:", error);
        return res.status(500).json({ 
          ok: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    });

    app.get("/api/dev/create-test-user", async (_req, res) => {
      try {
        const testUser = {
          name: "ผู้ทดสอบ",
          email: "test@ordera.local",
          password: "Test1234!",
          role: "manager" as const,
        };

        const existing = await getUserByEmail(testUser.email);
        if (existing) {
          await updateUserPasswordByEmail(testUser.email, testUser.password);
          await updateUserRoleByEmail(testUser.email, testUser.role);
          return res.json({ 
            ok: true, 
            user: { ...testUser, status: "updated" },
            message: "อัปเดตรหัสผ่านเรียบร้อย"
          });
        }

        await createInternalUser(testUser);
        return res.json({ 
          ok: true, 
          user: { ...testUser, status: "created" },
          message: "สร้างบัญชีเรียบร้อย"
        });
      } catch (error) {
        console.error("[create-test-user] Error:", error);
        return res.status(500).json({ 
          ok: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    });

    // Endpoint เพื่อสร้าง/อัปเดตรหัสเทสทั้งหมด
    app.get("/api/dev/setup-test-accounts", async (_req, res) => {
      try {
        const testAccounts = [
          {
            name: "หัวหน้า",
            email: "head@ordera.local",
            password: "Head1234!",
            role: "manager" as const,
          },
          {
            name: "พนักงาน",
            email: "staff@ordera.local",
            password: "Staff1234!",
            role: "cashier" as const,
          },
          {
            name: "ผู้ทดสอบ",
            email: "test@ordera.local",
            password: "Test1234!",
            role: "manager" as const,
          },
        ];

        const results = [];
        for (const account of testAccounts) {
          try {
            const existing = await getUserByEmail(account.email);
            if (existing) {
              await updateUserPasswordByEmail(account.email, account.password);
              await updateUserRoleByEmail(account.email, account.role);
              results.push({ ...account, status: "updated" });
            } else {
              await createInternalUser(account);
              results.push({ ...account, status: "created" });
            }
          } catch (error) {
            console.error(`[setup-test-accounts] Error for ${account.email}:`, error);
            results.push({ ...account, status: "error", error: error instanceof Error ? error.message : "Unknown error" });
          }
        }

        return res.json({ 
          ok: true, 
          accounts: results,
          message: "ตั้งค่ารหัสเทสเรียบร้อย"
        });
      } catch (error) {
        console.error("[setup-test-accounts] Error:", error);
        return res.status(500).json({ 
          ok: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    });

    // Test endpoint สำหรับตรวจสอบการเชื่อมต่อฐานข้อมูล
    app.get("/api/dev/test-db", async (_req, res) => {
      try {
        console.log("[test-db] Starting MongoDB connection test...");
        
        // ตรวจสอบ MONGODB_URI
        const uri = process.env.MONGODB_URI || "";
        if (!uri) {
          return res.status(500).json({
            ok: false,
            error: "MONGODB_URI is not configured",
            hint: "Please check your env.runtime file and ensure MONGODB_URI is set"
          });
        }
        
        // Mask password in URI for logging
        const maskedUri = uri.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
        console.log(`[test-db] MongoDB URI: ${maskedUri}`);
        
        const { getMongoDb } = await import("./mongo");
        console.log("[test-db] Attempting to connect...");
        
        const db = await getMongoDb();
        console.log("[test-db] Connection successful, listing collections...");
        
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        console.log(`[test-db] Found ${collectionNames.length} collections`);
        
        // ทดสอบการอ่าน/เขียน
        const testCollection = db.collection("test_connection");
        const testDoc = { test: true, timestamp: new Date(), testId: Date.now() };
        
        console.log("[test-db] Testing insert...");
        const insertResult = await testCollection.insertOne(testDoc);
        
        console.log("[test-db] Testing read...");
        const found = await testCollection.findOne({ testId: testDoc.testId });
        
        console.log("[test-db] Testing delete...");
        const deleteResult = await testCollection.deleteOne({ testId: testDoc.testId });
        
        return res.json({
          ok: true,
          message: "Database connection successful",
          database: db.databaseName,
          uri: maskedUri,
          collections: {
            count: collectionNames.length,
            names: collectionNames
          },
          test: {
            insert: insertResult.acknowledged ? "success" : "failed",
            read: found ? "success" : "failed",
            delete: deleteResult.deletedCount > 0 ? "success" : "failed"
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("[test-db] Error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        // Provide helpful hints based on error type
        let hints: string[] = [];
        if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
          hints.push("DNS resolution failed - check your internet connection");
          hints.push("Verify MongoDB Atlas cluster is running");
        } else if (errorMessage.includes("authentication failed") || errorMessage.includes("unauthorized")) {
          hints.push("Check MongoDB username and password in MONGODB_URI");
          hints.push("Verify user has proper permissions");
        } else if (errorMessage.includes("timeout")) {
          hints.push("Connection timeout - check network connection");
          hints.push("Verify MongoDB Atlas IP whitelist includes your IP (or 0.0.0.0/0 for all)");
        } else if (errorMessage.includes("MONGODB_URI is not configured")) {
          hints.push("Set MONGODB_URI in env.runtime file");
        }
        
        return res.status(500).json({
          ok: false,
          error: errorMessage,
          hints: hints.length > 0 ? hints : undefined,
          stack: process.env.NODE_ENV === "development" ? errorStack : undefined
        });
      }
    });

    // Test endpoint สำหรับตรวจสอบ environment variables
    app.get("/api/dev/test-env", async (_req, res) => {
      try {
        const mongodbUri = process.env.MONGODB_URI || "";
        const maskedUri = mongodbUri ? mongodbUri.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@") : "NOT SET";
        
        return res.json({
          ok: true,
          env: {
            NODE_ENV: process.env.NODE_ENV || "NOT SET",
            PORT: process.env.PORT || "NOT SET",
            MONGODB_URI: maskedUri,
            JWT_SECRET: process.env.JWT_SECRET ? `SET (length: ${process.env.JWT_SECRET.length})` : "NOT SET",
            DOTENV_CONFIG_PATH: process.env.DOTENV_CONFIG_PATH || "env.runtime (default)"
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Test endpoint สำหรับตรวจสอบ JWT_SECRET
    app.get("/api/dev/test-jwt", async (_req, res) => {
      try {
        const { ENV } = await import("./env");
        const jwtSecret = process.env.JWT_SECRET;
        const cookieSecret = ENV.cookieSecret;
        
        // ทดสอบสร้าง session token
        let tokenTest = "not attempted";
        try {
          const testToken = await sdk.createSessionToken("test_openid", { name: "Test User" });
          tokenTest = testToken ? "success" : "failed";
        } catch (error) {
          tokenTest = `failed: ${error instanceof Error ? error.message : String(error)}`;
        }
        
        return res.json({
          ok: true,
          env: {
            DOTENV_CONFIG_PATH: process.env.DOTENV_CONFIG_PATH ?? "not set",
            NODE_ENV: process.env.NODE_ENV ?? "not set",
            JWT_SECRET: jwtSecret ? `set (length: ${jwtSecret.length})` : "NOT SET",
            ENV_cookieSecret: cookieSecret ? `set (length: ${cookieSecret.length})` : "NOT SET",
          },
          tokenTest,
        });
      } catch (error) {
        console.error("[test-jwt] Error:", error);
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    });

    // List all users endpoint สำหรับตรวจสอบ
    app.get("/api/dev/list-users", async (_req, res) => {
      try {
        const { getUsers } = await import("../db");
        const users = await getUsers();
        return res.json({
          ok: true,
          count: users.length,
          users: users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt
          }))
        });
      } catch (error) {
        console.error("[list-users] Error:", error);
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Test registration endpoint สำหรับทดสอบ
    app.post("/api/dev/test-register", async (req, res) => {
      try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
          return res.status(400).json({
            ok: false,
            error: "Missing required fields: name, email, password"
          });
        }
        
        console.log("[test-register] Testing registration for:", email);
        
        // Check existing
        const existing = await getUserByEmail(email);
        if (existing) {
          return res.status(400).json({
            ok: false,
            error: "Email already exists",
            existingUser: {
              id: existing.id,
              email: existing.email,
              name: existing.name
            }
          });
        }
        
        // Create user
        const newUser = await createInternalUser({
          name,
          email,
          password,
          role: "manager"
        });
        
        // Verify insertion
        const verifyUser = await getUserByEmail(email);
        
        return res.json({
          ok: true,
          message: "Registration test successful",
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            openId: newUser.openId
          },
          verified: verifyUser ? "found" : "not found"
        });
      } catch (error) {
        console.error("[test-register] Error:", error);
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    });

    // Fix counters endpoint - แก้ไข counter ให้ตรงกับ max ID ที่มีอยู่
    app.get("/api/dev/fix-counters", async (_req, res) => {
      try {
        console.log("[fix-counters] Starting counter fix...");
        const { getMongoDb } = await import("./mongo");
        const db = await getMongoDb();
        const users = db.collection("users");
        const customers = db.collection("customers");
        const counters = db.collection("counters");
        
        // Get max user ID
        const maxUser = await users.find({}).sort({ id: -1 }).limit(1).toArray();
        const maxUserId = maxUser.length > 0 ? maxUser[0].id : 0;
        console.log("[fix-counters] Max user ID found:", maxUserId);
        
        // Get max customer ID
        const maxCustomer = await customers.find({}).sort({ id: -1 }).limit(1).toArray();
        const maxCustomerId = maxCustomer.length > 0 ? maxCustomer[0].id : 0;
        console.log("[fix-counters] Max customer ID found:", maxCustomerId);
        
        // Update user counter
        await counters.updateOne(
          { _id: "users" },
          { $set: { seq: maxUserId } },
          { upsert: true }
        );
        
        // Update customer counter
        await counters.updateOne(
          { _id: "customers" },
          { $set: { seq: maxCustomerId } },
          { upsert: true }
        );
        
        const userCounter = await counters.findOne({ _id: "users" });
        const customerCounter = await counters.findOne({ _id: "customers" });
        const nextUserId = (userCounter?.seq ?? maxUserId) + 1;
        const nextCustomerId = (customerCounter?.seq ?? maxCustomerId) + 1;
        
        console.log("[fix-counters] Counters updated:", {
          maxUserId,
          userCounterValue: userCounter?.seq ?? 0,
          nextUserId,
          maxCustomerId,
          customerCounterValue: customerCounter?.seq ?? 0,
          nextCustomerId
        });
        
        return res.json({
          ok: true,
          message: "Counters fixed",
          users: {
            maxUserId,
            counterValue: userCounter?.seq ?? 0,
            nextUserId
          },
          customers: {
            maxCustomerId,
            counterValue: customerCounter?.seq ?? 0,
            nextCustomerId
          }
        });
      } catch (error) {
        console.error("[fix-counters] Error:", error);
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Endpoint to check loyalty settings
    app.get("/api/dev/check-loyalty", async (_req, res) => {
      try {
        const { getLoyaltySettings } = await import("../db");
        const settings = await getLoyaltySettings();
        
        return res.json({
          ok: true,
          settings: settings || null,
          isActive: settings?.isActive || false,
          pointsPerBaht: settings?.pointsPerBaht || 0,
          message: settings ? "Loyalty settings found" : "No loyalty settings found"
        });
      } catch (error) {
        console.error("[check-loyalty] Error:", error);
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Endpoint to list all customers
    app.get("/api/dev/list-customers", async (_req, res) => {
      try {
        const { getMongoDb } = await import("./mongo");
        const db = await getMongoDb();
        const customers = db.collection("customers");
        
        const allCustomers = await customers.find({}).toArray();
        const customerIds = allCustomers.map(c => c.id).sort((a, b) => b - a);
        const maxCustomerId = customerIds.length > 0 ? customerIds[0] : 0;
        
        return res.json({
          ok: true,
          totalCustomers: allCustomers.length,
          maxCustomerId,
          customers: allCustomers.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            organizationId: c.organizationId,
            createdAt: c.createdAt
          }))
        });
      } catch (error) {
        console.error("[list-customers] Error:", error);
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // List all toppings (for debugging)
    app.get("/api/dev/list-toppings", async (_req, res) => {
      try {
        const { getMongoDb } = await import("./mongo");
        const db = await getMongoDb();
        const toppings = db.collection("toppings");
        
        const allToppings = await toppings.find({}).toArray();
        
        return res.json({
          ok: true,
          count: allToppings.length,
          toppings: allToppings.map(t => ({
            id: t.id,
            name: t.name,
            price: t.price,
            organizationId: t.organizationId,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          })),
        });
      } catch (error) {
        console.error("[dev/list-toppings] Error:", error);
        return res.status(500).json({ error: String(error) });
      }
    });

    // Check current user's organizationId
    app.get("/api/dev/check-user-org", async (req, res) => {
      try {
        const { ENV } = await import("./env");
        const sessionToken = req.cookies?.[COOKIE_NAME];
        if (!sessionToken) {
          return res.json({ error: "No session token" });
        }
        const session = await sdk.verifySession(sessionToken);
        if (!session) {
          return res.json({ error: "Invalid session" });
        }
        const user = await getUserById(session.userId);
        if (!user) {
          return res.json({ error: "User not found" });
        }
        const orgId = getUserOrganizationId(user);
        return res.json({
          userId: user.id,
          userEmail: user.email,
          userOrganizationId: user.organizationId,
          calculatedOrgId: orgId,
          message: `User's organizationId: ${orgId}`,
        });
      } catch (error) {
        console.error("[dev/check-user-org] Error:", error);
        return res.status(500).json({ error: String(error) });
      }
    });

    // Seed toppings (สร้างข้อมูลท็อปปิ้งตัวอย่าง)
    app.post("/api/dev/seed-toppings", async (req, res) => {
      try {
        const { ENV } = await import("./env");
        const { getMongoDb } = await import("./mongo");
        const { getNextSeq } = await import("../db");
        
        // ตรวจสอบ session (optional - ถ้าไม่มีจะใช้ organizationId = 1)
        let orgId: number | null = 1;
        const sessionToken = req.cookies?.[COOKIE_NAME];
        if (sessionToken) {
          const session = await sdk.verifySession(sessionToken);
          if (session) {
            const user = await getUserByOpenId(session.openId);
            if (user) {
              orgId = getUserOrganizationId(user);
            }
          }
        }

        const db = await getMongoDb();
        const toppings = db.collection("toppings");
        
        // ตรวจสอบว่ามีท็อปปิ้งอยู่แล้วหรือไม่
        const existing = await toppings.find({ organizationId: orgId }).toArray();
        if (existing.length > 0) {
          return res.json({
            ok: true,
            message: `พบท็อปปิ้ง ${existing.length} รายการอยู่แล้ว`,
            existing: existing.map(t => ({ id: t.id, name: t.name, price: t.price })),
            organizationId: orgId,
          });
        }

        // สร้างท็อปปิ้งตัวอย่าง
        const sampleToppings = [
          { name: "ไข่มุก", price: 10 },
          { name: "เฉาก๊วย", price: 10 },
          { name: "ชีส", price: 20 },
          { name: "เบคอน", price: 15 },
          { name: "ไข่", price: 5 },
          { name: "ไส้กรอก", price: 15 },
          { name: "แฮม", price: 12 },
          { name: "ผักกาด", price: 5 },
        ];

        const now = new Date();
        const insertedToppings = [];

        for (const topping of sampleToppings) {
          const id = await getNextSeq("toppings");
          const doc = {
            id,
            name: topping.name,
            price: topping.price,
            organizationId: orgId,
            createdAt: now,
            updatedAt: now,
          };
          await toppings.insertOne(doc);
          insertedToppings.push(doc);
        }

        return res.json({
          ok: true,
          message: `สร้างท็อปปิ้ง ${insertedToppings.length} รายการสำเร็จ`,
          organizationId: orgId,
          toppings: insertedToppings.map(t => ({
            id: t.id,
            name: t.name,
            price: t.price,
          })),
        });
      } catch (error) {
        console.error("[dev/seed-toppings] Error:", error);
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Endpoint to check counter status
    app.get("/api/dev/check-counters", async (_req, res) => {
      try {
        const { getMongoDb } = await import("./mongo");
        const db = await getMongoDb();
        const users = db.collection("users");
        const counters = db.collection("counters");
        
        // Get all users with their IDs
        const allUsers = await users.find({}).toArray();
        const userIds = allUsers.map(u => u.id).sort((a, b) => b - a);
        const maxUserId = userIds.length > 0 ? userIds[0] : 0;
        const duplicateIds = userIds.filter((id, index) => userIds.indexOf(id) !== index);
        
        // Get counter value
        const counter = await counters.findOne({ _id: "users" });
        
        return res.json({
          ok: true,
          totalUsers: allUsers.length,
          maxUserId,
          counterValue: counter?.seq ?? 0,
          nextUserId: (counter?.seq ?? maxUserId) + 1,
          duplicateIds: [...new Set(duplicateIds)],
          allUserIds: userIds.slice(0, 10), // Show first 10 IDs
          users: allUsers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name
          }))
        });
      } catch (error) {
        console.error("[check-counters] Error:", error);
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
  }
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // File upload endpoint - handle multipart/form-data
  app.post("/api/upload", async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.files || !req.files.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get file data
      const fileData = file.data;
      const fileName = file.name || "image.jpg";
      const mimetype = file.mimetype || "image/jpeg";

      // Validate file type (only images)
      if (!mimetype.startsWith("image/")) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      // Check if storage is configured
      const hasStorageConfig = !!process.env.BUILT_IN_FORGE_API_URL && !!process.env.BUILT_IN_FORGE_API_KEY;
      
      if (!hasStorageConfig) {
        console.warn("[upload] Storage not configured, using base64 data URL");
        // Fallback: return base64 data URL
        const base64Data = fileData.toString("base64");
        const dataUrl = `data:${mimetype};base64,${base64Data}`;
        return res.json({ url: dataUrl });
      }

      // Upload to storage using storagePut
      const fileExtension = fileName.split(".").pop() || "jpg";
      const storageFileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      
      console.log("[upload] Uploading file:", {
        originalName: fileName,
        storageName: storageFileName,
        mimetype,
        size: fileData.length,
      });

      try {
        const { url } = await storagePut(
          storageFileName,
          fileData as Buffer,
          mimetype
        );

        console.log("[upload] File uploaded successfully:", url);
        console.log("[upload] Full response:", { key: storageFileName, url });
        
        // Verify URL format
        if (!url || typeof url !== "string") {
          console.error("[upload] Invalid URL returned from storage:", url);
          // Fallback to base64
          const base64Data = fileData.toString("base64");
          const dataUrl = `data:${mimetype};base64,${base64Data}`;
          return res.json({ url: dataUrl });
        }
        
        return res.json({ url });
      } catch (storageError) {
        console.error("[upload] Storage upload failed:", storageError);
        // Fallback: return base64 data URL
        const base64Data = fileData.toString("base64");
        const dataUrl = `data:${mimetype};base64,${base64Data}`;
        console.log("[upload] Using base64 fallback");
        return res.json({ url: dataUrl });
      }
    } catch (error) {
      console.error("[upload] Error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Upload failed"
      });
    }
  });
  
  // tRPC API - ต้องอยู่ก่อน Vite middleware
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path, type, ctx, input }) => {
        console.error(`[tRPC Error] ${type} ${path}:`, {
          error: error.message,
          code: error.code,
          stack: error.stack,
          input,
        });
      },
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    try {
      console.log("⚙️  Setting up Vite...");
      await setupVite(app, server);
      console.log("✅ Vite setup complete");
    } catch (error) {
      console.error("❌ Vite setup failed:", error);
      throw error;
    }
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  console.log(`🔍 Finding available port starting from ${preferredPort}...`);
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`⚠️  Port ${preferredPort} is busy, using port ${port} instead`);
  }

  console.log(`🎯 Starting server on port ${port}...`);
  server.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server running on http://localhost:${port}/`);
    console.log(`📊 MongoDB Test: http://localhost:${port}/api/dev/test-db`);
    console.log(`🌐 Frontend: http://localhost:${port}/`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${port} is already in use`);
      console.error(`💡 Please stop the process using port ${port} or use a different port`);
    } else {
      console.error(`❌ Server error:`, error);
    }
  });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.error("Error details:", error instanceof Error ? error.stack : error);
    throw error;
  }
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  console.error("Error details:", error instanceof Error ? error.stack : error);
  process.exit(1);
});
