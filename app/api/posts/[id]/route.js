import { db } from "@/db"
import { posts, users, likes, comments } from "@/db/schema"
import { eq, desc, getTableColumns } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { NextResponse } from "next/server"
import { getCachedSession } from "@/lib/session"
import { trackMetric } from "@/lib/metrics"
import { formatPost } from "@/lib/postFormatting"
import { 
  redis, 
  getPostCache, 
  setPostCache, 
  getCommentsCache, 
  setCommentsCache,
  getUserLikes,
  setUserLikes 
} from "@/lib/redis"

export async function GET(request, { params }) {
    const { id: postId } = await params;
    try {
        // --- 1. PROACTIVE CACHE READ ---
        const sessionPromise = getCachedSession();
        const cachedPostPromise = getPostCache(postId);
        const cachedCommentsPromise = getCommentsCache(postId);

        const [session, cachedPost, cachedComments] = await Promise.all([
           sessionPromise,
           cachedPostPromise,
           cachedCommentsPromise
        ]);

        let artifactData = cachedPost;
        let artifactComments = cachedComments;
        let artifactRemixes = []; 
        let cacheHit = artifactData !== null;

        // --- 2. PERSONALIZATION SYNC (Zero-DB if cached) ---
        let userLikes = new Set();
        if (session?.user?.id) {
            const cachedL = await getUserLikes(session.user.id);
            if (cachedL) {
               userLikes = new Set(cachedL);
               trackMetric('CACHE', 'UserLikes');
            } else {
               trackMetric('DB', 'UserLikes-Cold');
               const allL = await db.select({ postId: likes.postId }).from(likes).where(eq(likes.userId, session.user.id));
               const ids = allL.map(l => l.postId);
               userLikes = new Set(ids);
               await setUserLikes(session.user.id, ids);
            }
        }

        // --- 3. RECONCILIANTION (Only if Core Cache Miss) ---
        if (!cacheHit) {
            trackMetric('DB', 'PostDetails-Cold-Miss');
            
            // Parallel DB Fetch
            const [postArray, dbComments, dbRemixes] = await Promise.all([
                db.select({
                    ...getTableColumns(posts),
                    user: { username: users.username, avatar: users.avatar, title: users.title, isVerified: users.isVerified, isDeveloper: users.isDeveloper },
                    parentDescription: alias(posts, 'parentPosts').description,
                    parentAuthorUsername: alias(users, 'parentUsers').username
                })
                .from(posts)
                .leftJoin(users, eq(posts.authorId, users.id))
                .leftJoin(alias(posts, 'parentPosts'), eq(posts.forkedFromId, alias(posts, 'parentPosts').id))
                .leftJoin(alias(users, 'parentUsers'), eq(alias(posts, 'parentPosts').authorId, alias(users, 'parentUsers').id))
                .where(eq(posts.id, postId)),

                db.select({
                    id: comments.id,
                    text: comments.text,
                    createdAt: comments.createdAt,
                    user: { username: users.username, avatar: users.avatar }
                }).from(comments).leftJoin(users, eq(comments.userId, users.id)).where(eq(comments.postId, postId)).orderBy(desc(comments.createdAt)),

                db.select({
                    ...getTableColumns(posts),
                    user: { username: users.username, avatar: users.avatar }
                }).from(posts).leftJoin(users, eq(posts.authorId, users.id)).where(eq(posts.forkedFromId, postId)).orderBy(desc(posts.createdAt))
            ]);

            if (postArray.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
            
            artifactData = postArray[0];
            artifactComments = dbComments;
            artifactRemixes = dbRemixes;

            // BACKGROUND WARM
            await Promise.all([
               setPostCache(artifactData),
               setCommentsCache(postId, artifactComments)
            ]).catch(() => {});
        } else {
            trackMetric('CACHE', 'PostDetails');
            // Even if post is cached, we might need remixes which are too heavy to cache deeply
            if (!artifactRemixes.length) {
               artifactRemixes = await db.select({
                  ...getTableColumns(posts),
                  user: { username: users.username, avatar: users.avatar }
               }).from(posts).leftJoin(users, eq(posts.authorId, users.id)).where(eq(posts.forkedFromId, postId)).orderBy(desc(posts.createdAt));
            }
        }

        // --- 4. PAYLOAD COMPOSITION ---
        const payload = {
           ...formatPost(artifactData, session, userLikes),
           comments: (artifactComments || []).map(c => ({ 
               ...c, 
               date: c.createdAt ? formatPost({ createdAt: c.createdAt }, session).date : 'Just now' 
           })),
           forks: artifactRemixes.map(r => formatPost(r, session, userLikes))
        };


        return NextResponse.json(payload, { 
           headers: { 
              'X-Cache': cacheHit ? 'HIT' : 'MISS',
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120'
           } 
        });

    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const post = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
        if (post.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (post[0].authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await db.delete(posts).where(eq(posts.id, id));
        
        // --- ATOMIC REDIS PURGE ---
        if (process.env.UPSTASH_REDIS_REST_URL) {
            await redis.del(`post:${id}`);
            await redis.del(`post:${id}:comments`);
            await redis.lrem('feed:global', 0, id); 
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
