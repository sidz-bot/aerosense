/**
 * Error Handling Middleware
 *
 * Global error handlers for consistent error responses
 * PHASE 6: Enhanced with 4xx/5xx classification for observability
 */

import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { AuthError } from '../types/user.types';

// =============================================================================
// ERROR RESPONSE FORMATTING
// =============================================================================

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

// =============================================================================
// ERROR HANDLERS
// =============================================================================

/**
 * Global error handler with 4xx/5xx classification (PHASE 6)
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const statusCode = error.statusCode || 500;

  // Classify error type for observability
  const errorClass = classifyError(statusCode);

  // Log error with classification
  logger.error({
    error: {
      message: error.message,
      code: error.code,
      statusCode: statusCode,
      classification: errorClass, // PHASE 6: 4xx vs 5xx
    },
    request: {
      method: request.method,
      url: request.url,
      requestId: request.id, // PHASE 6: Request ID for tracing
      headers: request.headers,
    },
  }, `Request error - ${errorClass}`); // PHASE 6: Classification in log message

  // Handle different error types
  if (error instanceof ZodError) {
    handleValidationError(error, reply);
    return;
  }

  if (error instanceof AuthError) {
    handleAuthError(error, reply);
    return;
  }

  // Handle validation errors
  if (error.code === 'FST_ERR_VALIDATION') {
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      },
    });
    return;
  }

  // Handle rate limiting
  if (error.code === 'FST_ERR_RATE_LIMIT') {
    reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    });
    return;
  }

  // Default error response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.stack = error.stack;
  }

  reply.status(statusCode).send(response);
}

/**
 * Classify error by status code (PHASE 6)
 * @returns '4xx_client_error' | '5xx_server_error' | 'unknown'
 */
function classifyError(statusCode: number): string {
  if (statusCode >= 400 && statusCode < 500) {
    return '4xx_client_error';
  }
  if (statusCode >= 500 && statusCode < 600) {
    return '5xx_server_error';
  }
  return 'unknown';
}

/**
 * Handle Zod validation errors
 */
function handleValidationError(error: ZodError, reply: FastifyReply): void {
  const details = error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  reply.status(400).send({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details,
    },
  });
}

/**
 * Handle authentication errors
 */
function handleAuthError(error: AuthError, reply: FastifyReply): void {
  reply.status(error.statusCode || 401).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

/**
 * Handle 404 errors
 */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
  });
}

/**
 * Handle 405 Method Not Allowed
 */
export function methodNotAllowedHandler(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  reply.status(405).send({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${request.method} not allowed for ${request.url}`,
    },
  });
}
