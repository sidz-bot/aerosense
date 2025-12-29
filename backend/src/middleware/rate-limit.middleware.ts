/**
 * Rate Limiting Middleware
 *
 * Rate limiting using Redis for distributed systems
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { cacheService } from '../utils/redis';
import { logger } from '../utils/logger';
import { config } from '../config';

// =============================================================================
// TYPES
// =============================================================================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// =============================================================================
// RATE LIMITER
// =============================================================================

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(options: RateLimitConfig) {
  const { windowMs, maxRequests } = options;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Get user ID from JWT if authenticated, otherwise use IP
      const userId = (request as any).user?.sub || request.ip;
      const key = `ratelimit:${userId}:${Date.now()}`.slice(0, -10); // Round to nearest 10 seconds

      // Get current count
      const current = await cacheService.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await cacheService.set(key, current, windowSeconds);
      }

      const remaining = Math.max(0, maxRequests - current);

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', maxRequests);
      reply.header('X-RateLimit-Remaining', remaining);
      reply.header('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + windowSeconds);

      if (current > maxRequests) {
        reply.status(429).send({
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded, please try again later',
          },
        });
        return;
      }
    } catch (error) {
      logger.error({ error }, 'Rate limit check failed');
      // Fail open - allow request if rate limiter fails
    }
  };
}

/**
 * Free tier rate limiter
 */
export const freeRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.free,
});

/**
 * Premium tier rate limiter
 */
export const premiumRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.premium,
});

/**
 * Role-based rate limiter
 */
export function createRoleBasedRateLimiter() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as any).user;

    if (!user) {
      // Use free tier for unauthenticated
      return freeRateLimiter(request, reply);
    }

    const limiter = user.role === 'PREMIUM' || user.role === 'ADMIN'
      ? premiumRateLimiter
      : freeRateLimiter;

    return limiter(request, reply);
  };
}
