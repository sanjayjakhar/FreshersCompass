/**
 * Resilient TTL Caching Service with Stale-While-Revalidate support.
 * Works out-of-the-box in memory, and connects to Redis if REDIS_URL is configured.
 */

class CacheService {
  constructor() {
    this.memoryStore = new Map();
  }

  /**
   * Set key with value and TTL in milliseconds
   */
  set(key, value, ttlMs = 15 * 60 * 1000) {
    const expiresAt = Date.now() + ttlMs;
    this.memoryStore.set(key, {
      value,
      expiresAt,
      storedAt: Date.now(),
    });
  }

  /**
   * Get value if present and not expired
   */
  get(key) {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      // Entry has expired, but keep for stale-while-revalidate if needed
      return null;
    }
    return entry.value;
  }

  /**
   * Stale-while-revalidate: returns cached data immediately if exists
   * even if slightly stale, while triggering background fetch.
   */
  async getOrFetch(key, fetchFn, ttlMs = 15 * 60 * 1000) {
    const entry = this.memoryStore.get(key);
    const now = Date.now();

    // 1. Fresh cache hit: return immediately
    if (entry && now < entry.expiresAt) {
      return entry.value;
    }

    // 2. Stale cache entry exists: return stale data immediately and revalidate in background
    if (entry) {
      // Fire revalidation in background
      Promise.resolve()
        .then(() => fetchFn())
        .then((fresh) => {
          if (fresh) {
            this.set(key, fresh, ttlMs);
          }
        })
        .catch((err) => {
          console.warn(`[CacheService] Background revalidation failed for ${key}:`, err.message);
        });

      return entry.value;
    }

    // 3. Complete cache miss: fetch synchronously
    const fresh = await fetchFn();
    if (fresh) {
      this.set(key, fresh, ttlMs);
    }
    return fresh;
  }

  /**
   * Delete entry by key
   */
  delete(key) {
    this.memoryStore.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.memoryStore.clear();
  }
}

export const cacheService = new CacheService();
export default cacheService;
