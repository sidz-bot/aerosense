/**
 * Notification Routes
 *
 * Endpoints for device token management and notification history.
 *
 * Routes:
 * - POST /notifications/register - Register device token for push notifications
 * - DELETE /notifications/register - Unregister device token
 * - GET /notifications/history - Get notification history
 * - GET /notifications/tokens - Get user's registered device tokens
 *
 * Note: APNS delivery is PAUSED - no iOS client available.
 * These endpoints only handle database persistence.
 *
 * PHASE 6: Added rate limiting to all endpoints
 */

import type { FastifyInstance } from 'fastify';
import { createRoleBasedRateLimiter } from '../middleware/rate-limit.middleware';
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getDeviceTokens,
  getNotificationHistory,
} from '../services/notification.service';
import type { ApiError, ApiResponse } from '../types/flight.types';
import { logger } from '../utils/logger';

// =============================================================================
// Route Handler
// =============================================================================

export async function notificationRoutes(fastify: FastifyInstance) {
  // PHASE 6: Apply role-based rate limiting to all notification routes
  const rateLimiter = createRoleBasedRateLimiter();

  // ===========================================================================
  // All routes require authentication + rate limiting
  // ===========================================================================

  /**
   * POST /api/v1/notifications/register
   * Register a device token for push notifications
   * PHASE 6: Rate limited + authenticated
   *
   * Request body: { token: string, platform: 'ios' | 'android' }
   * Response: { id, token, platform, createdAt }
   */
  fastify.post('/register', {
    onRequest: [rateLimiter, fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        const errResponse: ApiError = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
          },
        };
        return reply.code(401).send(errResponse);
      }

      // Validate request body
      const body = request.body as Record<string, unknown>;
      if (!body.token || typeof body.token !== 'string') {
        const errResponse: ApiError = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'token is required and must be a string',
          },
        };
        return reply.code(400).send(errResponse);
      }

      if (!body.platform || typeof body.platform !== 'string' || !['ios', 'android'].includes(body.platform)) {
        const errResponse: ApiError = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'platform is required and must be "ios" or "android"',
          },
        };
        return reply.code(400).send(errResponse);
      }

      const result = await registerDeviceToken(userId, {
        token: body.token,
        platform: body.platform as 'ios' | 'android',
      });

      const response: ApiResponse<typeof result> = {
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      logger.info({ userId, tokenId: result.id }, 'Device token registered');

      return reply.code(201).send(response);
    } catch (error) {
      logger.error({ error }, 'Device token registration error');

      const errResponse: ApiError = {
        error: {
          code: 'REGISTRATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to register device token',
        },
      };
      return reply.code(400).send(errResponse);
    }
  });

  /**
   * DELETE /api/v1/notifications/register
   * Unregister a device token
   * PHASE 6: Rate limited + authenticated
   *
   * Request body: { token: string }
   * Response: 204 No Content
   */
  fastify.delete('/register', {
    onRequest: [rateLimiter, fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        const errResponse: ApiError = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
          },
        };
        return reply.code(401).send(errResponse);
      }

      // Validate request body
      const body = request.body as Record<string, unknown>;
      if (!body.token || typeof body.token !== 'string') {
        const errResponse: ApiError = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'token is required and must be a string',
          },
        };
        return reply.code(400).send(errResponse);
      }

      await unregisterDeviceToken(userId, body.token);

      logger.info({ userId }, 'Device token unregistered');

      return reply.code(204).send();
    } catch (error) {
      logger.error({ error }, 'Device token unregistration error');

      const errResponse: ApiError = {
        error: {
          code: 'UNREGISTRATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to unregister device token',
        },
      };
      return reply.code(400).send(errResponse);
    }
  });

  /**
   * GET /api/v1/notifications/tokens
   * Get all registered device tokens for the user
   * PHASE 6: Rate limited + authenticated
   *
   * Response: { tokens: [{ id, token, platform, createdAt }] }
   */
  fastify.get('/tokens', {
    onRequest: [rateLimiter, fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        const errResponse: ApiError = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
          },
        };
        return reply.code(401).send(errResponse);
      }

      const tokens = await getDeviceTokens(userId);

      const response: ApiResponse<{ tokens: typeof tokens }> = {
        data: { tokens },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      logger.error({ error }, 'Get device tokens error');

      const errResponse: ApiError = {
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch device tokens',
        },
      };
      return reply.code(400).send(errResponse);
    }
  });

  /**
   * GET /api/v1/notifications/history
   * Get notification history for the user
   * PHASE 6: Rate limited + authenticated
   *
   * Query params: limit (default: 20), offset (default: 0)
   * Response: { notifications: [...], total: number }
   */
  fastify.get('/history', {
    onRequest: [rateLimiter, fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        const errResponse: ApiError = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
          },
        };
        return reply.code(401).send(errResponse);
      }

      const query = request.query as Record<string, string>;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;
      const offset = query.offset ? parseInt(query.offset, 10) : 0;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        const errResponse: ApiError = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'limit must be between 1 and 100',
          },
        };
        return reply.code(400).send(errResponse);
      }

      if (offset < 0) {
        const errResponse: ApiError = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'offset must be non-negative',
          },
        };
        return reply.code(400).send(errResponse);
      }

      const result = await getNotificationHistory(userId, { limit, offset });

      const response: ApiResponse<typeof result> = {
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      logger.error({ error }, 'Get notification history error');

      const errResponse: ApiError = {
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch notification history',
        },
      };
      return reply.code(400).send(errResponse);
    }
  });
}
