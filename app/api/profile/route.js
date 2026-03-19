import { db } from "@/db"
import { posts, users, likes } from "@/db/schema"
import { desc, eq, getTableColumns } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getCachedSession } from "@/lib/session"
import { 
  redis, 
  getProfileCache, 
  setProfileCache, 
  getUserLikes, 
  setUserLikes,
  hydratePosts
} from "@/lib/redis"
import { trackMetric } from "@/lib/metrics"
import { formatPost } from "@/lib/postFormatting"

export async function GET(request) {
  try {
    const session = await getCachedSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    // --- 1. PROACTIVE PROFILE CACHE ---
    const profilePromise = getProfileCache(userId);
    const likesPromise = getUserLikes(userId);

    const [cachedProfile, cachedL] = await Promise.all([profilePromise, likesPromise]);

    let profilePosts = cachedProfile;
    let cacheHit = cachedProfile !== null;

    let postData = [];
    if (cacheHit) {
        trackMetric('CACHE', 'Profile');
        
        // Backward compatibility: If cache has full objects, force a DB fetch 
        // to reset the cache to use IDs, rather than returning stale objects.
        if (profilePosts.length > 0 && typeof profilePosts[0] === 'object') {
            trackMetric('CACHE', 'Profile-Legacy-Purge');
            cacheHit = false; 
        } else {
            postData = await hydratePosts(profilePosts);
            postData = postData.filter(p => p !== null);
        }
    }
    
    if (!cacheHit) {
        trackMetric('DB', 'Profile-Cold-Miss');
        const dbPosts = await db.select({
             ...getTableColumns(posts),
             user: { username: users.username, avatar: users.avatar, title: users.title, isVerified: users.isVerified, isDeveloper: users.isDeveloper }
         }).from(posts)
           .leftJoin(users, eq(posts.authorId, users.id))
           .where(eq(posts.authorId, userId))
           .orderBy(desc(posts.createdAt));

        postData = dbPosts;
        const ids = dbPosts.map(p => p.id);
        // Background warming: Cache ONLY the IDs for profile, ensuring counts are pulled from post level cache
        await setProfileCache(userId, ids).catch(() => {});
    }

    // --- 2. PERSONALIZATION LAYER ---
    let userLikes = new Set();
    if (cachedL) {
       trackMetric('CACHE', 'UserLikes');
       userLikes = new Set(cachedL);
    } else {
       trackMetric('DB', 'UserLikes-Cold');
       const likedRows = await db.select({ postId: likes.postId }).from(likes).where(eq(likes.userId, userId))
       const ids = likedRows.map(r => r.postId);
       userLikes = new Set(ids);
       await setUserLikes(userId, ids).catch(() => {});
    }

    const formattedPosts = postData.map(p => formatPost(p, session, userLikes));



    return NextResponse.json({ posts: formattedPosts }, { 
       headers: { 
          'X-Cache': cacheHit ? 'HIT' : 'MISS',
          'Cache-Control': 'private, no-store'
       } 
    });
  } catch (error) {
    console.error("Profile API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
