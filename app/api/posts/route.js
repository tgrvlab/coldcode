import { db } from "@/db"
import { posts, users, likes } from "@/db/schema"
import { desc, eq, getTableColumns } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { NextResponse } from "next/server"
import { getCachedSession } from "@/lib/session"
import { 
  getUserLikes, 
  setUserLikes, 
  getGlobalFeed, 
  hydratePosts, 
  warmGlobalFeed
} from "@/lib/redis"

import { trackMetric } from "@/lib/metrics"
import { formatPost } from "@/lib/postFormatting"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    // --- 1. PROACTIVE SESSION + FEED FETCH ---
    const sessionPromise = getCachedSession();
    const feedIdsPromise = getGlobalFeed(limit, offset);

    const [session, cachedIds] = await Promise.all([sessionPromise, feedIdsPromise]);

    // --- 2. PERSONALIZATION LAYER (Zero-DB) ---
    let userLikes = new Set();
    if (session?.user?.id) {
        const cachedL = await getUserLikes(session.user.id);
        if (cachedL) {
           trackMetric('CACHE', 'UserLikes');
           userLikes = new Set(cachedL);
        } else {
           // On-demand warm for likes if missing (first request only)
           trackMetric('DB', 'UserLikes-Cold');
           const likedRows = await db.select({ postId: likes.postId }).from(likes).where(eq(likes.userId, session.user.id))
           const ids = likedRows.map(r => r.postId);
           userLikes = new Set(ids);
           await setUserLikes(session.user.id, ids);
        }
    }

    // --- 3. THE REDIS-FIRST FEED ---
    let feedData = [];
    let cacheHit = false;

    if (cachedIds && cachedIds.length > 0) {
       const hydrated = await hydratePosts(cachedIds);
       feedData = hydrated.filter(p => p !== null);
       
       // If we retrieved enough posts from cache, it's a win
       if (feedData.length >= Math.min(limit, cachedIds.length)) {
          trackMetric('CACHE', 'GlobalFeed');
          cacheHit = true;
       }
    }

    // --- 4. THE PROACTIVE RECONCILIATION ---
    if (!cacheHit) {
       trackMetric('DB', 'GlobalFeed-Cold-Miss');
       
       const dbPosts = await db
         .select({
            ...getTableColumns(posts),
            user: { 
               username: users.username, 
               avatar: users.avatar, 
               title: users.title, 
               isVerified: users.isVerified, 
               isDeveloper: users.isDeveloper 
            },
            parentDescription: alias(posts, 'parentPosts').description,
            parentAuthorUsername: alias(users, 'parentUsers').username
         })
         .from(posts)
         .leftJoin(users, eq(posts.authorId, users.id))
         .leftJoin(alias(posts, 'parentPosts'), eq(posts.forkedFromId, alias(posts, 'parentPosts').id))
         .leftJoin(alias(users, 'parentUsers'), eq(alias(posts, 'parentPosts').authorId, alias(users, 'parentUsers').id))
         .orderBy(desc(posts.createdAt))
         .limit(50) // Fetch more for warming
         .offset(0);

       feedData = dbPosts.slice(offset, offset + limit);

       // PROACTIVE WARMING: Populate the next 50 posts into cache
       if (dbPosts.length > 0) {
          await warmGlobalFeed(dbPosts).catch(() => {});
       }
    }

    // --- 5. NORMALIZE & RETURN ---
    const postsWithStatus = feedData.map(p => formatPost(p, session, userLikes));


    return NextResponse.json({
       posts: postsWithStatus,
       nextCursor: feedData.length === limit ? page + 1 : null
    }, { 
       headers: { 
          'X-Cache': cacheHit ? 'HIT' : 'MISS',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
       } 
    });

  } catch (error) {
    console.error("Feed error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
