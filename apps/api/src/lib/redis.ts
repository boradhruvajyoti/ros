// =============================================================================
// Redis client with in-memory resilient fallback
// =============================================================================

import Redis from 'ioredis';
import { logger } from './logger';

let isConnected = false;
const inMemoryCache = new Map<string, { value: string; expiry: number }>();

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy: () => null, // don't spam reconnect loops if redis is offline
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.connect().then(() => {
  isConnected = true;
  logger.info('✅ Redis connected successfully');
}).catch((err) => {
  logger.warn(`ℹ️ Redis not reachable (${err.message}). Using high-performance in-memory cache.`);
});

redis.on('connect', () => { isConnected = true; });
redis.on('error', () => { isConnected = false; });

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isConnected) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch {}
  }
  const cached = inMemoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    try { return JSON.parse(cached.value) as T; } catch {}
  }
  return null;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_TTL
): Promise<void> {
  const serialized = JSON.stringify(value);
  if (isConnected) {
    try {
      await redis.set(key, serialized, 'EX', ttlSeconds);
    } catch {}
  }
  inMemoryCache.set(key, { value: serialized, expiry: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  if (isConnected) {
    try { await redis.del(key); } catch {}
  }
  inMemoryCache.delete(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (isConnected) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch {}
  }
  const prefix = pattern.replace('*', '');
  for (const k of inMemoryCache.keys()) {
    if (k.startsWith(prefix)) inMemoryCache.delete(k);
  }
}

export const CacheKeys = {
  menu: (tenantId: string, branchId: string) => `menu:${tenantId}:${branchId}`,
  tables: (tenantId: string, branchId: string) => `tables:${tenantId}:${branchId}`,
  permissions: (userId: string) => `perms:${userId}`,
  orderNumber: (tenantId: string, branchId: string, date: string) =>
    `seq:ORDER:${tenantId}:${branchId}:${date}`,
};

export default redis;
