/**
 * Redis Cache Utility
 *
 * Provides caching layer with TTL support for reducing API costs
 * Implements 60-second default TTL as per architecture specifications
 */

import Redis from 'ioredis';
import { logger } from './logger';
import { config } from '../config';

// =============================================================================
// SINGLETON REDIS CLIENT
// =============================================================================

let redisClient: Redis | null = null;

/**
 * Get or create Redis client singleton
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: config.redis.maxRetries,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });
  }

  return redisClient;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

// =============================================================================
// CACHE SERVICE
// =============================================================================

export class CacheService {
  private client: Redis;
  private defaultTTL: number;

  constructor(ttlSeconds: number = 60) {
    this.client = getRedisClient();
    this.defaultTTL = ttlSeconds;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl ?? this.defaultTTL;

      await this.client.setex(key, expiry, serialized);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error');
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(...keys);
      return keys.length;
    } catch (error) {
      logger.error({ error, pattern }, 'Cache delete pattern error');
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Cache exists error');
      return false;
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      logger.debug({ key }, 'Cache hit');
      return cached;
    }

    logger.debug({ key }, 'Cache miss, computing value');
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error({ error, key }, 'Cache incr error');
      return 0;
    }
  }

  /**
   * Set with expiration only if key doesn't exist
   */
  async setNX<T>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const result = await this.client.set(key, serialized, 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error({ error, key }, 'Cache setNX error');
      return false;
    }
  }

  /**
   * Get TTL remaining for key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error({ error, key }, 'Cache TTL error');
      return -1;
    }
  }

  /**
   * Flush all cache (use with caution)
   */
  async flush(): Promise<boolean> {
    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      logger.error({ error }, 'Cache flush error');
      return false;
    }
  }
}

// =============================================================================
// CACHE KEY GENERATORS
// =============================================================================

export const CacheKeys = {
  /**
   * Flight data cache key
   * Format: flight:{flightId}:{date}
   */
  flight: (flightId: string, date: string) =>
    `flight:${flightId}:${date}`,

  /**
   * User tracked flights cache key
   * Format: flights:user:{userId}:tracked
   */
  userTrackedFlights: (userId: string) =>
    `flights:user:${userId}:tracked`,

  /**
   * Connection risk analysis cache key
   * Format: connections:{incomingId}:{outgoingId}
   */
  connectionRisk: (incomingId: string, outgoingId: string) =>
    `connections:${incomingId}:${outgoingId}`,

  /**
   * Airport search results cache key
   * Format: airports:search:{query}
   */
  airportSearch: (query: string) =>
    `airports:search:${query.toLowerCase()}`,

  /**
   * Flight search results cache key
   * Format: flights:search:{type}:{params_hash}
   */
  flightSearch: (type: string, params: Record<string, string>) => {
    const paramString = new URLSearchParams(params).toString();
    return `flights:search:${type}:${Buffer.from(paramString).toString('base64')}`;
  },

  /**
   * User session cache key
   * Format: session:{userId}
   */
  session: (userId: string) =>
    `session:${userId}`,

  /**
   * Rate limit counter key
   * Format: ratelimit:{userId}:{window}
   */
  rateLimit: (userId: string, window: string) =>
    `ratelimit:${userId}:${window}`,
};

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================

export const cacheService = new CacheService(config.redis.ttl);
