import { Db, MongoClient } from "mongodb";
import dns from "dns";

let client: MongoClient | null = null;
let db: Db | null = null;

// Set DNS servers to use
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

export async function getMongoDb() {
  if (db && client) {
    try {
      // Test if connection is still alive
      await client.db("admin").command({ ping: 1 });
      return db;
    } catch (error) {
      // Connection lost, reset
      console.warn("[MongoDB] Connection lost, reconnecting...");
      try {
        await client.close();
      } catch {}
      client = null;
      db = null;
    }
  }

  let uri = (process.env.MONGODB_URI_STANDARD || process.env.MONGODB_URI || "").trim();
  if (!uri) {
    throw new Error("MONGODB_URI is not configured. Set it in env.runtime (local) or in your host's Environment (e.g. Render dashboard).");
  }

  // MONGODB_URI_STANDARD: Use Standard connection string (not SRV) to avoid SSL alert 80 on Render
  if (process.env.MONGODB_URI_STANDARD) {
    console.log("[MongoDB] Using MONGODB_URI_STANDARD (non-SRV format)");
  }
  // แสดง host (ไม่แสดงรหัสผ่าน) เพื่อเช็กว่าโหลด URI ถูก
  try {
    const match = uri.match(/@([^/]+)/);
    console.log("[MongoDB] Host:", match ? match[1] : "(parse skip)");
  } catch {}

  // Force TLS for Atlas
  if (uri.includes("mongodb") && !uri.includes("tls=") && !uri.includes("ssl=")) {
    const sep = uri.includes("?") ? "&" : "?";
    uri = `${uri}${sep}tls=true`;
  }

  try {
    console.log("[MongoDB] Connecting to MongoDB...");
    const options: import("mongodb").MongoClientOptions = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      autoSelectFamily: false,
      family: 4,
      tls: true,
      tlsAllowInvalidCertificates: true,
    };
    client = new MongoClient(uri, options);
    await client.connect();
    // Extract database name from URI (รองรับทั้ง mongodb:// และ mongodb+srv://)
    let dbName = "ordera";
    try {
      const uriObj = new URL(uri.replace(/^mongodb\+srv:/i, "https:"));
      const pathPart = uriObj.pathname?.replace(/^\//, "").split("?")[0]?.trim();
      if (pathPart) dbName = pathPart;
    } catch {
      const pathMatch = uri.match(/\/([^/?]+)(?:\?|$)/);
      if (pathMatch) dbName = pathMatch[1];
    }
    db = client.db(dbName);
    console.log(`[MongoDB] ✅ Connected successfully to database: ${dbName}`);
    return db;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[MongoDB] ❌ Connection failed:", errorMessage);
    
    // Provide helpful hints
    if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
      console.error("[MongoDB] 💡 DNS resolution failed. Check internet connection and MongoDB Atlas cluster status.");
    } else if (errorMessage.includes("authentication failed") || errorMessage.includes("unauthorized")) {
      console.error("[MongoDB] 💡 Authentication failed. ใน Atlas: Database Access → Edit User → Edit Password → ตั้งรหัสให้ตรงกับ MONGODB_URI แล้วกด Save. เช็ค Network Access → Allow Access from Anywhere (0.0.0.0/0) หรือเพิ่ม IP เครื่องคุณ.");
    } else if (errorMessage.includes("timeout")) {
      console.error("[MongoDB] 💡 Connection timeout. Atlas → Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0) แล้วรอ 1–2 นาที.");
    } else if (errorMessage.includes("0A000438") || errorMessage.includes("SSL alert number 80")) {
      console.error("[MongoDB] 💡 SSL alert 80 (บน Render): ใช้ MONGODB_URI_STANDARD แทน mongodb+srv. Atlas → Connect → Drivers → Standard connection string → ใส่ user/password → ต่อท้าย &directConnection=true → ตั้งใน Render เป็น MONGODB_URI_STANDARD.");
    }
    
    if (client) {
      try {
        await client.close();
      } catch {}
      client = null;
    }
    db = null;
    throw error;
  }
}
