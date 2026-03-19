import { db } from "@/db"
import { posts, comments } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { redis } from "@/lib/redis"

export async function POST(req, { params }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: postId } = await params;
  
  try {
      const { text } = await req.json()
      if (!text?.trim()) return NextResponse.json({ error: "Empty comment" }, { status: 400 })

      const newId = Date.now().toString()

      // 1. ATOMIC DB WRITE (Source of Truth)
      await db.transaction(async (tx) => {
          await tx.insert(comments).values({
             id: newId,
             userId: session.user.id,
             postId: postId,
             text: text
          })
          await tx.update(posts).set({ commentsCount: sql`${posts.commentsCount} + 1` }).where(eq(posts.id, postId))
      })
      
      // --- THE TITAN PROACTIVE SYNC ---
      const { refillPostCache, invalidateCache } = await import("@/lib/redis");
      await refillPostCache(postId); // Explicitly push fresh counts
      
      const authorRows = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId)).limit(1);
      if (authorRows.length > 0) {
         await invalidateCache(`profile:${authorRows[0].authorId}`);
      }
      
      return NextResponse.json({ success: true, id: newId })
  } catch(e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
