/**
 * Unified Redis-Backed Distributed Cache Adapter with In-Memory Fallback.
 * 
 * If REDIS_URL is provided in environment variables, connects to Redis via ioredis
 * with automatic reconnection and graceful degradation.
 * If REDIS_URL is unset or connection fails, seamlessly falls back to the in-memory store
 * ensuring zero-dependency local development.
 */
import Redis from "ioredis";

class CacheService {
  constructor() {
    this.memoryStore = new Map();
    this.redisClient = null;
    this.isRedisReady = false;

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: 2,
          connectTimeout: 4000,
          retryStrategy(times) {
            if (times > 10) {
              console.warn("[CacheService] Redis retry limit reached; staying on in-memory fallback.");
              return null;
            }
            return Math.min(times * 200, 3000);
          },
          lazyConnect: true,
        });

        this.redisClient.on("connect", () => {
          this.isRedisReady = true;
          console.log("[CacheService] Connected to Redis distributed cache adapter.");
        });

        this.redisClient.on("ready", () => {
          this.isRedisReady = true;
        });

        this.redisClient.on("error", (err) => {
          console.warn("[CacheService] Redis connection error, utilizing in-memory fallback:", err.message);
          this.isRedisReady = false;
        });

        this.redisClient.on("close", () => {
          this.isRedisReady = false;
        });

        this.redisClient.connect().catch((err) => {
          console.warn("[CacheService] Initial Redis connect failed, using memory fallback:", err.message);
          this.isRedisReady = false;
        });
      } catch (err) {
        console.warn("[CacheService] Redis client initialization error:", err.message);
        this.redisClient = null;
        this.isRedisReady = false;
      }
    }
  }

  /**
   * Set key with value and TTL in milliseconds
   */
  async set(key, value, ttlMs = 15 * 60 * 1000) {
    const expiresAt = Date.now() + ttlMs;
    // Always populate in-memory store immediately
    this.memoryStore.set(key, {
      value,
      expiresAt,
      storedAt: Date.now(),
    });

    if (this.isRedisReady && this.redisClient) {
      try {
        const ttlSec = Math.max(1, Math.round(ttlMs / 1000));
        await this.redisClient.set(key, JSON.stringify(value), "EX", ttlSec);
      } catch (err) {
        console.warn(`[CacheService] Redis set error for key ${key}:`, err.message);
      }
    }
  }

  /**
   * Get value if present and not expired
   */
  async get(key) {
    // 1. Try Redis if connected
    if (this.isRedisReady && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (err) {
        console.warn(`[CacheService] Redis get error for key ${key}:`, err.message);
      }
    }

    // 2. Fall back to in-memory store
    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Stale-while-revalidate: returns cached data immediately if exists,
   * otherwise fetches synchronously.
   */
  async getOrFetch(key, fetchFn, ttlMs = 15 * 60 * 1000) {
    // Check cache first
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // Cache miss: execute fetch
    const fresh = await fetchFn();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlMs);
    }
    return fresh;
  }

  /**
   * Delete entry by key
   */
  async delete(key) {
    this.memoryStore.delete(key);
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {
        console.warn(`[CacheService] Redis delete error for key ${key}:`, err.message);
      }
    }
  }

  /**
   * Clear all entries
   */
  async clear() {
    this.memoryStore.clear();
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (err) {
        console.warn("[CacheService] Redis flush error:", err.message);
      }
    }
  }
}

export const cacheService = new CacheService();
export default cacheService;
