import { auth } from "@/auth"
import { getSessionCache, setSessionCache } from "@/lib/redis"
import { trackMetric } from "@/lib/metrics"
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function getCachedSession() {
  // --- TITAN IDENTITY RECON (Redis Token Mapping) ---
  const cookieStore = await cookies();
  const token = cookieStore.get("authjs.session-token")?.value || cookieStore.get("__Secure-authjs.session-token")?.value;
  
  if (!token) {
     return null;
  }

  // Use hashed token as Redis key (security)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const key = `session:raw:${tokenHash}`;

  const cachedResult = await getSessionCache(key);
  if (cachedResult) {
     trackMetric('CACHE', 'Session-Profile');
     return cachedResult;
  }

  // --- DB RECOVERY ---
  trackMetric('DB', 'Session-Auth-Reconcile');
  const session = await auth();
  
  if (session?.user?.id) {
     // Cache the fully hydrated session for 10 minutes
     await setSessionCache(key, session, 600);
  }

  return session;
}
