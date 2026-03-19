import { db } from "@/db"
import { posts, users } from "@/db/schema"
import { desc, eq, getTableColumns } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { warmGlobalFeed, setPostCache } from "@/lib/redis"
import { NextResponse } from "next/server"

export async function GET() {
  try {
     const dbPosts = await db
      .select({
         ...getTableColumns(posts),
         user: { username: users.username, avatar: users.avatar, title: users.title, isVerified: users.isVerified, isDeveloper: users.isDeveloper },
         parentDescription: alias(posts, 'parentPosts').description,
         parentAuthorUsername: alias(users, 'parentUsers').username
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(alias(posts, 'parentPosts'), eq(posts.forkedFromId, alias(posts, 'parentPosts').id))
      .leftJoin(alias(users, 'parentUsers'), eq(alias(posts, 'parentPosts').authorId, alias(users, 'parentUsers').id))
      .orderBy(desc(posts.createdAt))
      .limit(100);

    if (dbPosts.length > 0) {
       await warmGlobalFeed(dbPosts);
       // Deeply cache top 20
       for (const post of dbPosts.slice(0, 20)) {
          await setPostCache(post);
       }
    }

    return NextResponse.json({ success: true, count: dbPosts.length, warmed: "100 posts" });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
