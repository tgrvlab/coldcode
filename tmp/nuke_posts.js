import { db } from "./db/index.js"
import { posts, likes, dislikes, comments, runs } from "./db/schema.js"
import { redis } from "./lib/redis.js"

async function nuke() {
  console.log("NUCLEAR OPTION ACTIVATED: Deleting all post-related data...");

  try {
    // Delete children first (Foreign Key constraint satisfaction)
    await db.delete(likes);
    await db.delete(dislikes);
    await db.delete(comments);
    await db.delete(runs);
    
    // Delete parent artifacts
    const deleted = await db.delete(posts);
    
    console.log("Database Nuke: SUCCESS.");

    // Network Cache Purge
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const keys = await redis.keys("*");
      if (keys.length > 0) await redis.del(...keys);
      console.log("Redis Cache: PURGED.");
    }

  } catch (e) {
    console.error("FAILSAFE TRIGGERED: System error during nuke:", e.message);
  }

  process.exit(0);
}

nuke();
