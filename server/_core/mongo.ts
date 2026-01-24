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

  const uri = process.env.MONGODB_URI || "";
  if (!uri) {
    throw new Error("MONGODB_URI is not configured. Set it in env.runtime (local) or in your host's Environment (e.g. Render dashboard).");
  }
  
  try {
    console.log("[MongoDB] Connecting to MongoDB...");
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    await client.connect();
    // Extract database name from URI or use default
    const uriObj = new URL(uri);
    const dbName = uriObj.pathname?.replace(/^\//, "").split("?")[0] || "test";
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
      console.error("[MongoDB] 💡 Authentication failed. Check username and password in MONGODB_URI.");
    } else if (errorMessage.includes("timeout")) {
      console.error("[MongoDB] 💡 Connection timeout. Check network and MongoDB Atlas IP whitelist.");
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
