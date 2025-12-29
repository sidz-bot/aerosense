//
//  Authentication Middleware
//
//  JWT verification and user authentication for protected routes
//

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthError, AuthErrorCode } from '../types/user.types';
import { logger } from '../utils/logger';

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Verify JWT token and attach user to request
 */
export async function authenticateToken(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError(AuthErrorCode.UNAUTHORIZED, 'Missing or invalid authorization header', 401);
    }

    // Verify token using Fastify JWT
    const decoded = await request.jwtVerify() as {
      sub: string;
      email: string;
      role: string;
      type: 'access' | 'refresh';
    };

    // Ensure it's an access token
    if (decoded.type !== 'access') {
      throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token type', 401);
    }

    // Attach user to request
    request.user = decoded;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    logger.error({ error }, 'Token verification failed');
    throw new AuthError(AuthErrorCode.UNAUTHORIZED, 'Invalid token', 401);
  }
}

/**
 * Check if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = request.user as { sub: string; email: string; role: string; type: string } | undefined;

    if (!user) {
      throw new AuthError(AuthErrorCode.UNAUTHORIZED, 'Authentication required', 401);
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AuthError(AuthErrorCode.UNAUTHORIZED, 'Insufficient permissions', 403);
    }
  };
}

/**
 * Optional authentication - attach user if token present, don't error if not
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      await authenticateToken(request, _reply);
    }
  } catch {
    // Ignore errors for optional auth
  }
}
