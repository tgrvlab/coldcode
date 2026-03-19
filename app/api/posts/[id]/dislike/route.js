import { db } from "@/db"
import { posts, dislikes } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { trackMetric } from "@/lib/metrics"

export async function POST(request, { params }) {
    const { id } = await params;
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        trackMetric('DB'); // Interaction request always hits DB for safety
        const existing = await db.select().from(dislikes).where(and(eq(dislikes.postId, id), eq(dislikes.userId, session.user.id))).limit(1);
        
        if (existing.length > 0) {
            // Remove dislike
            await db.delete(dislikes).where(eq(dislikes.id, existing[0].id));
            await db.update(posts).set({ dislikesCount: sql`${posts.dislikesCount} - 1` }).where(eq(posts.id, id));
            return NextResponse.json({ success: true, action: 'removed' });
        } else {
            // Add dislike
            await db.insert(dislikes).values({
               id: Date.now().toString(),
               userId: session.user.id,
               postId: id
            });
            await db.update(posts).set({ dislikesCount: sql`${posts.dislikesCount} + 1` }).where(eq(posts.id, id));
            return NextResponse.json({ success: true, action: 'added' });
        }
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
