import 'dotenv/config'
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq, or } from "drizzle-orm"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,


  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github") {
        try {
          const githubId = String(profile?.id || user?.id); 
          const username = profile?.login || user?.name?.replace(/\s/g, '').toLowerCase() || 'dev_' + githubId.slice(0, 5);

          const existing = await db.select().from(users).where(or(eq(users.id, githubId), eq(users.username, username)));
          
          if (existing.length === 0) {
            await db.insert(users).values({
              id: githubId,
              username: username,
              name: user?.name || profile?.login,
              email: user?.email,
              avatar: user?.image,
              title: 'Developer',
            });
            user.id = githubId;
          } else {
             const existingUser = existing[0];
             await db.update(users).set({ avatar: user?.image }).where(eq(users.id, existingUser.id));
             user.id = existingUser.id; // Override NextAuth UUID with canonical DB ID
          }
        } catch(e) {
          console.error("SignIn DB error:", e);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
        try {
          // --- PROACTIVE USER CACHING ---
          const { getUserCache, setUserCache } = await import("@/lib/redis");
          const cachedUser = await getUserCache(token.sub);
          
          if (cachedUser) {
            session.user.username = cachedUser.username;
            session.user.avatar = cachedUser.avatar;
            session.user.title = cachedUser.title;
          } else {
            const dbUser = await db.select().from(users).where(eq(users.id, token.sub));
            if (dbUser.length > 0) {
              const u = dbUser[0];
              session.user.username = u.username;
              session.user.avatar = u.avatar;
              session.user.title = u.title;
              await setUserCache(token.sub, { username: u.username, avatar: u.avatar, title: u.title });
            }
          }
        } catch(e) {
           console.error("Session Cache/DB error:", e);
        }
      }
      return session;
    },
    async jwt({ token, user, profile }) {
       if (user?.id) {
         token.sub = String(user.id);
       } else if (profile?.id && !token.sub) {
         token.sub = String(profile.id);
       }
       return token;
    }
  },
  session: { strategy: "jwt" },
})
