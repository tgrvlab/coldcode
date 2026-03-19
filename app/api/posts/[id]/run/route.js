import { db } from "@/db"
import { posts, runs } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function POST(req, { params }) {
  const session = await auth()
  const { id: postId } = await params;
  
  if (!postId) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

  try {
      if (session?.user?.id) {
         try {
             await db.insert(runs).values({
                 id: Date.now().toString(),
                 userId: session.user.id,
                 postId: postId
             })
         } catch(e) { } // Ignore duplicate inserts or orphans
      }

      await db.update(posts).set({ runsCount: sql`${posts.runsCount} + 1` }).where(eq(posts.id, postId))
      
      return NextResponse.json({ success: true })
  } catch(e) {
      console.error("Run counter error:", e)
      return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
