import { db } from "./db/index.js"
import { posts, likes } from "./db/schema.js"
import { eq, count } from "drizzle-orm"

async function audit(postId) {
  const currentPost = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (currentPost.length === 0) {
    console.log("Post not found");
    process.exit(0);
  }

  const actualLikes = await db.select({ value: count() }).from(likes).where(eq(likes.postId, postId));
  const realCount = actualLikes[0].value;
  const storedCount = currentPost[0].likesCount;

  console.log(`--- POST AUDIT: ${postId} ---`);
  console.log(`Stored Count: ${storedCount}`);
  console.log(`Actual Records: ${realCount}`);

  if (storedCount !== realCount) {
    console.log("CRITICAL: Count mismatch detected. Fixing...");
    await db.update(posts).set({ likesCount: realCount }).where(eq(posts.id, postId));
    console.log("FIXED.");
  } else {
    console.log("Check complete. Counts are in sync.");
  }
  process.exit(0);
}

audit("1773863126174");
