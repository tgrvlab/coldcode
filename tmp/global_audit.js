import { db } from "./db/index.js"
import { posts, likes } from "./db/schema.js"
import { eq, count } from "drizzle-orm"

async function globalAudit() {
  const allPosts = await db.select().from(posts);
  console.log(`Auditing ${allPosts.length} posts...`);

  for (const post of allPosts) {
    const actualLikesArray = await db.select({ value: count() }).from(likes).where(eq(likes.postId, post.id));
    const realCount = Number(actualLikesArray[0].value);
    
    if (post.likesCount !== realCount || post.likesCount < 0) {
      console.log(`Post ${post.id}: Stored=${post.likesCount}, Real=${realCount}. Updating...`);
      await db.update(posts).set({ likesCount: realCount }).where(eq(posts.id, post.id));
    }
  }

  console.log("Global audit and repair complete.");
  process.exit(0);
}

globalAudit();
