import { Redis } from "@upstash/redis"
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'


const CACHE_FILE = path.join(process.cwd(), '.coldcode', 'vault.bin');
const SECRET = process.env.AUTH_SECRET || 'coldcode-local-fallback-salt';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

const loadLocalCache = () => {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const encryptedData = fs.readFileSync(CACHE_FILE);
            const iv = encryptedData.slice(0, 16);
            const authTag = encryptedData.slice(16, 32);
            const cipherText = encryptedData.slice(32);
            
            const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
            decipher.setAuthTag(authTag);
            
            const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
            return JSON.parse(decrypted.toString('utf8'));
        }
    } catch (e) { 
       // If decryption fails, start fresh (security boundary)
       return {}; 
    }
    return {};
};

const saveLocalCache = (cache) => {
    try {
        const dir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
        
        const plainText = JSON.stringify(cache);
        const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        
        // Structure: [IV (16)][AuthTag (16)][CipherText]
        const finalBuffer = Buffer.concat([iv, authTag, encrypted]);
        fs.writeFileSync(CACHE_FILE, finalBuffer);
        
        // Clean up old insecure JSON if it exists
        const oldFile = path.join(dir, 'local_cache.json');
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    } catch (e) { /* ignore */ }
};

// --- GLOBAL CACHE PERSISTENCE (Survives Next.js HMR) ---
if (!global._titan_cache) {
    global._titan_cache = loadLocalCache();
}
let localCache = global._titan_cache;

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://mock.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock',
})

export const isRedisReady = !!process.env.UPSTASH_REDIS_REST_URL;

// --- FEED MANAGEMENT ---
export async function getGlobalFeed(limit = 10, offset = 0) {
  if (!isRedisReady) return localCache['feed:global'] ? localCache['feed:global'].slice(offset, offset + limit) : null;
  return await redis.lrange('feed:global', offset, offset + limit - 1);
}

export async function pushToGlobalFeed(postId) {
  if (!isRedisReady) {
    const feed = localCache['feed:global'] || [];
    if (!feed.includes(postId)) {
        localCache['feed:global'] = [postId, ...feed].slice(0, 500);
        saveLocalCache(localCache);
    }
    return;
  }
  await redis.lpush('feed:global', postId);
  await redis.ltrim('feed:global', 0, 499);
}

export async function warmGlobalFeed(posts) {
  if (!posts?.length) return;
  if (!isRedisReady) {
    localCache['feed:global'] = posts.map(p => p.id);
    posts.forEach(p => localCache[`post:${p.id}`] = p);
    saveLocalCache(localCache);
    return;
  }
  const pipeline = redis.pipeline();
  pipeline.del('feed:global');
  posts.forEach(p => {
    pipeline.rpush('feed:global', p.id);
    pipeline.set(`post:${p.id}`, p, { ex: 3600 });
  });
  await pipeline.exec();
}

// --- POST HYDRATION ---
export async function setPostCache(post) {
  if (!post?.id) return;
  if (!isRedisReady) {
    localCache[`post:${post.id}`] = post;
    saveLocalCache(localCache);
    return;
  }
  await redis.set(`post:${post.id}`, post, { ex: 3600 });
}

export async function getPostCache(postId) {
  if (!isRedisReady) return localCache[`post:${postId}`] || null;
  return await redis.get(`post:${postId}`);
}

// --- BATCH HYDRATION ---
export async function hydratePosts(postIds) {
  if (!postIds.length) return [];
  if (!isRedisReady) {
    return postIds.map(id => localCache[`post:${id}`] || null);
  }
  const pipeline = redis.pipeline();
  postIds.forEach(id => pipeline.get(`post:${id}`));
  const decoded = await pipeline.exec();
  return decoded;
}

// --- COMMENTS CACHE ---
export async function setCommentsCache(postId, comments) {
  if (!isRedisReady) {
     localCache[`post:${postId}:comments`] = comments;
     saveLocalCache(localCache);
     return;
  }
  await redis.set(`post:${postId}:comments`, comments, { ex: 600 });
}

export async function getCommentsCache(postId) {
  if (!isRedisReady) return localCache[`post:${postId}:comments`] || null;
  return await redis.get(`post:${postId}:comments`);
}

// --- PROFILE CACHE ---
export async function setProfileCache(userId, profileData) {
  if (!isRedisReady) {
     localCache[`profile:${userId}`] = profileData;
     saveLocalCache(localCache);
     return;
  }
  await redis.set(`profile:${userId}`, profileData, { ex: 300 });
}

export async function getProfileCache(userId) {
  if (!isRedisReady) return localCache[`profile:${userId}`] || null;
  return await redis.get(`profile:${userId}`);
}

export async function setUserCache(userId, userData) {
  if (!isRedisReady) {
     localCache[`user:${userId}`] = userData;
     saveLocalCache(localCache);
     return;
  }
  await redis.set(`user:${userId}`, userData, { ex: 3600 });
}

export async function getUserCache(userId) {
  if (!isRedisReady) return localCache[`user:${userId}`] || null;
  return await redis.get(`user:${userId}`);
}

export async function warmProfile(userId, profileData) {
  await setProfileCache(userId, profileData);
}

export async function invalidateCache(key) {
  if (!isRedisReady) {
    // If it starts with post:, profile:, or user:, we can handle it
    delete localCache[key];
    saveLocalCache(localCache);
    return;
  }
  await redis.del(key);
}

export async function invalidatePost(postId) {
  await invalidateCache(`post:${postId}`);
  await invalidateCache(`post:${postId}:comments`);
}

export async function refillPostCache(postId) {
  const { db } = await import("@/db");
  const { posts, users } = await import("@/db/schema");
  const { eq, getTableColumns } = await import("drizzle-orm");
  const { alias } = await import("drizzle-orm/pg-core");

  const [post] = await db
    .select({
       ...getTableColumns(posts),
       user: { 
          username: users.username, 
          avatar: users.avatar, 
          title: users.title, 
          isVerified: users.isVerified, 
          isDeveloper: users.isDeveloper 
       },
       parentDescription: alias(posts, 'p2').description,
       parentAuthorUsername: alias(users, 'u2').username
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .leftJoin(alias(posts, 'p2'), eq(posts.forkedFromId, alias(posts, 'p2').id))
    .leftJoin(alias(users, 'u2'), eq(alias(posts, 'p2').authorId, alias(users, 'u2').id))
    .where(eq(posts.id, postId))
    .limit(1);

  if (post) {
    await setPostCache(post);
    return post;
  }
  return null;
}

// --- LOCKING ---
export async function acquireLock(key, ttl = 5) {
  if (!isRedisReady) return true; 
  const result = await redis.set(`lock:${key}`, "1", { nx: true, ex: ttl });
  return result === "OK";
}

export async function releaseLock(key) {
  if (!isRedisReady) return;
  await redis.del(`lock:${key}`);
}

export async function getSessionCache(key) {
  if (!isRedisReady) return localCache[`session:${key}`] || null;
  return await redis.get(key);
}

export async function setSessionCache(key, session, ex = 600) {
  if (!isRedisReady) {
    localCache[`session:${key}`] = session;
    saveLocalCache(localCache);
    return;
  }
  await redis.set(key, session, { ex });
}

// --- SESSION CACHE ---
export async function getUserLikes(userId) {
  if (!isRedisReady) {
     const val = localCache[`user:likes:${userId}`];
     return val || null;
  }
  try {
    const members = await redis.smembers(`user:likes:${userId}`);
    return (members && members.length > 0) ? members : null;
  } catch (e) { return null; }
}

export async function setUserLikes(userId, likesArray) {
  if (!likesArray?.length) return;
  if (!isRedisReady) {
     localCache[`user:likes:${userId}`] = likesArray;
     saveLocalCache(localCache);
     return;
  }
  try {
    const key = `user:likes:${userId}`;
    const pipeline = redis.pipeline();
    pipeline.del(key);
    pipeline.sadd(key, ...likesArray);
    pipeline.expire(key, 3600);
    await pipeline.exec();
  } catch (e) { console.error("Redis SetLikes Error:", e); }
}

export async function toggleUserLike(userId, postId, isAdd) {
  if (!isRedisReady) {
    let likes = localCache[`user:likes:${userId}`] || [];
    if (isAdd) {
       if (!likes.includes(postId)) likes.push(postId);
    } else {
       likes = likes.filter(id => id !== postId);
    }
    localCache[`user:likes:${userId}`] = likes;
    saveLocalCache(localCache);
    return;
  }
  const key = `user:likes:${userId}`;
  if (isAdd) await redis.sadd(key, postId);
  else await redis.srem(key, postId);
}

export async function isLikedByUser(userId, postId) {
    if (!userId) return false;
    if (!isRedisReady) {
        const likes = localCache[`user:likes:${userId}`] || [];
        return likes.includes(postId);
    }
    return await redis.sismember(`user:likes:${userId}`, postId);
}
