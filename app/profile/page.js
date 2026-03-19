import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import ProfileFeedClient from "@/components/ProfileFeedClient"
import { db } from "@/db"
import { posts, comments, users, likes } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { formatPost } from "@/lib/postFormatting"

export default async function ProfilePage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  // Fetch all basic stats from DB
  let userPosts = []
  let userComments = []
  
  try {
     userPosts = await db.select({
         id: posts.id,
         title: posts.title,
         code: posts.code,
         language: posts.language,
         filename: posts.filename,
         description: posts.description,
         theme: posts.theme,
         isFork: posts.isFork,
         likesCount: posts.likesCount,
         commentsCount: posts.commentsCount,
         remixesCount: posts.remixesCount,
         createdAt: posts.createdAt,
         user: {
            username: users.username,
            avatar: users.avatar,
            title: users.title
         }
     }).from(posts)
       .leftJoin(users, eq(posts.authorId, users.id))
       .where(eq(posts.authorId, session.user.id))
       .orderBy(desc(posts.createdAt))
       
     userComments = await db.select().from(comments).where(eq(comments.userId, session.user.id))
  } catch(e) { console.error(e) }

  // Fetch likes efficiently
  let userLikes = new Set()
  if (session?.user?.id) {
     try {
       const likedRows = await db.select({ postId: likes.postId }).from(likes).where(eq(likes.userId, session.user.id))
       likedRows.forEach(r => userLikes.add(r.postId))
     } catch(e) {}
  }

  const formattedPosts = userPosts.map(p => formatPost(p, session, userLikes))


  const myForks = formattedPosts.filter(p => p.isFork)
  const originalPosts = formattedPosts.filter(p => !p.isFork)

  return (
    <div className="min-h-screen bg-(--background) transition-colors flex justify-center">
       <Sidebar theme="dark" session={session} />
       
       <main className="lg:w-[45%] min-h-screen border-r border-l border-(--border)/50 bg-(--background) relative p-8">
           <div className="flex bg-(--card)/50 border border-(--border)/50 rounded-3xl p-8 gap-8 backdrop-blur shadow-2xl items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-(--accent)/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              
              <div className="w-24 h-24 rounded-full bg-black border border-white/5 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] z-10 shrink-0">
                 <img src={session.user.avatar || "/dev_avatar.png"} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col justify-center z-10">
                 <h1 className="text-3xl font-black text-(--foreground) tracking-tighter">{session.user.name}</h1>
                 <span className="text-(--muted) text-xs font-black tracking-[0.2em] uppercase mt-2 opacity-50">@{session.user.username}</span>
                 <p className="text-(--accent) text-[10px] font-black uppercase tracking-[0.3em] mt-4">{session.user.title || "Developer"}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-(--card) border border-(--border)/30 p-8 rounded-4xl flex flex-col hover:border-(--accent)/40 hover:shadow-[0_0_20px_rgba(255,70,85,0.05)] transition-all cursor-pointer group">
                 <span className="text-4xl font-black text-(--foreground) group-hover:text-(--accent) transition-colors">{originalPosts.length}</span>
                 <span className="text-[9px] text-(--muted) font-black uppercase tracking-[0.2em] mt-3">Originals</span>
              </div>
              <div className="bg-(--card) border border-(--border)/30 p-8 rounded-4xl flex flex-col hover:border-(--accent)/40 hover:shadow-[0_0_20px_rgba(255,70,85,0.05)] transition-all cursor-pointer group">
                 <span className="text-4xl font-black text-(--foreground) group-hover:text-(--accent) transition-colors">{myForks.length}</span>
                 <span className="text-[9px] text-(--muted) font-black uppercase tracking-[0.2em] mt-3">Remixes</span>
              </div>
              <div className="bg-(--card) border border-(--border)/30 p-8 rounded-4xl flex flex-col hover:border-(--accent)/40 hover:shadow-[0_0_20px_rgba(255,70,85,0.05)] transition-all cursor-pointer group">
                 <span className="text-4xl font-black text-(--foreground) group-hover:text-(--accent) transition-colors">{userComments.length}</span>
                 <span className="text-[9px] text-(--muted) font-black uppercase tracking-[0.2em] mt-3">Interactions</span>
              </div>
           </div>

           {/* Content Tabs */}
           <div className="flex border-b border-(--border)/30 mt-8 relative">
             <button className="py-5 text-[10px] font-black uppercase tracking-[0.3em] text-(--foreground) transition-all relative px-8 bg-white/2">
                Artifacts ({formattedPosts.length})
                <div className="absolute bottom-0 left-0 w-full h-1 bg-(--accent)" />
             </button>
             <button className="py-5 text-[10px] font-black uppercase tracking-[0.3em] text-(--muted) hover:text-(--foreground) transition-all px-8">
                Execution Log
             </button>
           </div>
           
           <div className="py-12 flex flex-col items-center justify-center">
              <ProfileFeedClient initialPosts={formattedPosts} session={session} />
           </div>
       </main>
    </div>
  )
}
