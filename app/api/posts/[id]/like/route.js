import { db } from "@/db"
import { posts, likes } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getCachedSession } from "@/lib/session"
import { toggleUserLike, redis } from "@/lib/redis"

export async function POST(req, { params }) {
  const session = await getCachedSession()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: postId } = await params;
  
  try {
      const existing = await db.select().from(likes).where(and(eq(likes.userId, session.user.id), eq(likes.postId, postId)))
      
      let state = false;
      await db.transaction(async (tx) => {
          if (existing.length > 0) {
              await tx.delete(likes).where(eq(likes.id, existing[0].id))
              await tx.update(posts).set({ likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)` }).where(eq(posts.id, postId))
              state = false;
          } else {
              await tx.insert(likes).values({
                 id: session.user.id + '_' + postId,
                 userId: session.user.id,
                 postId: postId
              }).onConflictDoNothing()
              await tx.update(posts).set({ likesCount: sql`${posts.likesCount} + 1` }).where(eq(posts.id, postId))
              state = true;
          }
      })
      
      // --- THE TITAN PROACTIVE SYNC ---
      const { toggleUserLike, refillPostCache, invalidateCache } = await import("@/lib/redis");

      await toggleUserLike(session.user.id, postId, state);
      await refillPostCache(postId); // Explicitly push fresh counts to cache
      await invalidateCache(`profile:${session.user.id}`);

      return NextResponse.json({ liked: state })
  } catch(e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
