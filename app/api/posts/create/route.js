import { db } from "@/db"
import { posts, users } from "@/db/schema"
import { eq, sql, getTableColumns } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { Ratelimit } from "@upstash/ratelimit"
import { 
  redis, 
  setPostCache, 
  pushToGlobalFeed 
} from "@/lib/redis"
import { revalidateTag, revalidatePath } from "next/cache"

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
})

export async function POST(req) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (process.env.UPSTASH_REDIS_REST_URL) {
      const { success } = await ratelimit.limit(session.user.id)
      if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  try {
    const body = await req.json()
    const newPostId = Date.now().toString() 
    
    // 1. ATOMIC DB WRITE (Source of Truth)
    await db.transaction(async (tx) => {
      await tx.insert(posts).values({
        id: newPostId,
        authorId: session.user.id,
        code: body.code,
        language: body.language,
        filename: body.filename,
        description: body.description,
        theme: body.theme,
        isFork: body.isFork || false,
        forkedFromId: body.forkedFromId || null,
        allowComments: body.allowComments !== undefined ? body.allowComments : true,
        allowRemixes: body.allowRemixes !== undefined ? body.allowRemixes : true
      });

      if (body.isFork && body.forkedFromId) {
         await tx.update(posts)
           .set({ remixesCount: sql`${posts.remixesCount} + 1` })
           .where(eq(posts.id, body.forkedFromId));
      }
    });

    // 2. HYDRATION & HOT CACHE FAN-OUT
    // Fetch once with joins to get the FULL Redis object
    const parentPosts = alias(posts, 'parentPosts');
    const parentUsers = alias(users, 'parentUsers');

    const [hydratedPost] = await db
      .select({
         ...getTableColumns(posts),
         user: {
            username: users.username,
            avatar: users.avatar,
            title: users.title,
            isVerified: users.isVerified,
            isDeveloper: users.isDeveloper
         },
         parentDescription: parentPosts.description,
         parentAuthorUsername: parentUsers.username
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(parentPosts, eq(posts.forkedFromId, parentPosts.id))
      .leftJoin(parentUsers, eq(parentPosts.authorId, parentUsers.id))
      .where(eq(posts.id, newPostId))
      .limit(1);

    if (hydratedPost && process.env.UPSTASH_REDIS_REST_URL) {
       // SET post:{id} as full JSON
       await setPostCache(hydratedPost);
       // LPUSH to feed:global
       await pushToGlobalFeed(newPostId);
       
       // Cleanup legacy bucket keys
       redis.del("feed:global:v3:1:10").catch(() => {});
    }

    revalidateTag('feed');
    revalidatePath('/');

    return NextResponse.json({ success: true, id: newPostId })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
