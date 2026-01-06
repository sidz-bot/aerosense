/**
 * Authentication Routes
 *
 * Endpoints for user registration, login, token refresh, and profile management.
 *
 * Routes:
 * - POST /auth/register - Register new user
 * - POST /auth/login - Login user
 * - POST /auth/refresh - Refresh access token
 * - POST /auth/logout - Logout user
 * - GET /auth/me - Get current user profile
 * - PATCH /auth/me - Update user profile
 * - PATCH /auth/notifications - Update notification preferences
 * - DELETE /auth/me - Delete user account
 */

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { freeRateLimiter } from '../middleware/rate-limit.middleware';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserProfile,
  updateNotificationPreferences,
  deleteUserAccount,
} from '../services/user.service';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateNotificationPrefsSchema,
  type AuthError,
} from '../types/user.types';
import { AuthErrorCode } from '../types/user.types';
import { logger } from '../utils/logger';

// =============================================================================
// Route Handler
// =============================================================================

export async function authRoutes(fastify: FastifyInstance) {
  // PHASE 6: Apply rate limiting to public auth endpoints
  // (login and register need stricter rate limiting for security)

  /**
   * POST /auth/register
   * Register a new user
   * PHASE 6: Rate limited (prevent abuse)
   */
  fastify.post('/auth/register', {
    onRequest: [freeRateLimiter],
  }, async (request, reply) => {
    try {
      const input = registerSchema.parse(request.body);
      const result = await registerUser(input);

      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        });
      }

      if (error instanceof Error && 'code' in error) {
        const authError = error as AuthError;
        return reply.status(authError.statusCode || 400).send({
          success: false,
          error: {
            code: authError.code,
            message: authError.message,
          },
        });
      }

      logger.error({ error }, 'Registration error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during registration',
        },
      });
    }
  });

  /**
   * POST /auth/login
   * Login with email/password
   * PHASE 6: Rate limited (prevent brute force)
   */
  fastify.post('/auth/login', {
    onRequest: [freeRateLimiter],
  }, async (request, reply) => {
    try {
      const input = loginSchema.parse(request.body);
      const result = await loginUser(input);

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        });
      }

      if (error instanceof Error && 'code' in error) {
        const authError = error as AuthError;
        return reply.status(authError.statusCode || 400).send({
          success: false,
          error: {
            code: authError.code,
            message: authError.message,
          },
        });
      }

      logger.error({ error }, 'Login error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login',
        },
      });
    }
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   * PHASE 6: Rate limited
   */
  fastify.post('/auth/refresh', {
    onRequest: [freeRateLimiter],
  }, async (request, reply) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(request.body);
      const result = await refreshAccessToken(refreshToken);

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        });
      }

      if (error instanceof Error && 'code' in error) {
        const authError = error as AuthError;
        return reply.status(authError.statusCode || 400).send({
          success: false,
          error: {
            code: authError.code,
            message: authError.message,
          },
        });
      }

      logger.error({ error }, 'Token refresh error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while refreshing token',
        },
      });
    }
  });

  // ===========================================================================
  // Protected Routes (require authentication)
  // ===========================================================================

  /**
   * POST /auth/logout
   * Logout user (invalidate refresh token)
   */
  fastify.post('/auth/logout', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      await logoutUser(userId);

      return reply.send({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      logger.error({ error }, 'Logout error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during logout',
        },
      });
    }
  });

  /**
   * GET /auth/me
   * Get current user profile
   */
  fastify.get('/auth/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      const profile = await getUserProfile(userId);

      return reply.send({
        success: true,
        data: profile,
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const authError = error as AuthError;
        return reply.status(authError.statusCode || 400).send({
          success: false,
          error: {
            code: authError.code,
            message: authError.message,
          },
        });
      }

      logger.error({ error }, 'Get profile error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching profile',
        },
      });
    }
  });

  /**
   * PATCH /auth/me
   * Update user profile
   */
  fastify.patch('/auth/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      // For now, just return the updated profile
      // In a full implementation, this would update the database
      const profile = await getUserProfile(userId);

      return reply.send({
        success: true,
        data: profile,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        });
      }

      logger.error({ error }, 'Update profile error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating profile',
        },
      });
    }
  });

  /**
   * PATCH /auth/notifications
   * Update notification preferences
   */
  fastify.patch('/auth/notifications', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      const input = updateNotificationPrefsSchema.parse(request.body);
      const prefs = await updateNotificationPreferences(userId, input);

      return reply.send({
        success: true,
        data: prefs,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        });
      }

      logger.error({ error }, 'Update notification preferences error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating preferences',
        },
      });
    }
  });

  /**
   * DELETE /auth/me
   * Delete user account
   */
  fastify.delete('/auth/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      await deleteUserAccount(userId);

      return reply.send({
        success: true,
        data: { message: 'Account deleted successfully' },
      });
    } catch (error) {
      logger.error({ error }, 'Delete account error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting account',
        },
      });
    }
  });
}
