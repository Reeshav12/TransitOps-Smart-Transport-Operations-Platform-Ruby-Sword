// In-memory rate limiter for TransitOps

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const ENTRY_TTL = 60 * 1000; // 1 minute TTL for entries

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < ENTRY_TTL);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Filter out timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: maxRequests - entry.timestamps.length, retryAfter: 0 };
}

// Get client IP from request securely
export function getClientIP(request: Request): string {
  // 1. NextRequest native IP (populated securely on Vercel/Next.js platforms)
  const reqIp = (request as any).ip;
  if (reqIp && typeof reqIp === 'string') {
    return reqIp;
  }

  // 2. Cloudflare Connecting IP (overwritten by Cloudflare edge proxy)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  // 3. X-Real-IP (overwritten by standard reverse proxies like Nginx)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // 4. X-Forwarded-For (standard chain)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP which is the client IP
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  return 'unknown';
}

// Auth rate limit: 5 attempts per minute per IP
export function checkAuthRateLimit(request: Request): { allowed: boolean; retryAfter: number } {
  const ip = getClientIP(request);
  const result = rateLimit(`auth:${ip}`, 5, 60 * 1000);
  return { allowed: result.allowed, retryAfter: result.retryAfter };
}

// Mutation rate limit: 30 requests per minute per user
export function checkMutationRateLimit(userId: string): { allowed: boolean; retryAfter: number } {
  const result = rateLimit(`mutation:${userId}`, 30, 60 * 1000);
  return { allowed: result.allowed, retryAfter: result.retryAfter };
}
