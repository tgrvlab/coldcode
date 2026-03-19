import { db } from "../db/index.js"
import { posts, users } from "../db/schema.js"
import { desc, eq, getTableColumns } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { warmGlobalFeed, setPostCache } from "../lib/redis.js"

export async function runWarming() {
  console.log("🚀 Starting Proactive Warming...");
  
  try {
    // 1. Warm Global Feed
    const dbPosts = await db
      .select({
         ...getTableColumns(posts),
         user: { username: users.username, avatar: users.avatar },
         parentDescription: alias(posts, 'parentPosts').description,
         parentAuthorUsername: alias(users, 'parentUsers').username
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(alias(posts, 'parentPosts'), eq(posts.forkedFromId, alias(posts, 'parentPosts').id))
      .leftJoin(alias(users, 'parentUsers'), eq(alias(posts, 'parentPosts').authorId, alias(users, 'parentUsers').id))
      .orderBy(desc(posts.createdAt))
      .limit(100);

    console.log(`📡 Fetched ${dbPosts.length} posts for warming.`);
    
    if (dbPosts.length > 0) {
       await warmGlobalFeed(dbPosts);
       console.log("✅ Global Feed Warmed.");
       
       // Individually cache top 20 posts deeply
       for (const post of dbPosts.slice(0, 20)) {
          await setPostCache(post);
       }
       console.log("✅ Top 20 Hot Posts Warmed.");
    }

    console.log("✨ Warming Complete.");
  } catch (e) {
    console.error("❌ Warming Error:", e);
  }
}

// If run directly
if (process.argv[1]?.endsWith('warm-cache.js')) {
   runWarming().then(() => process.exit(0));
}
