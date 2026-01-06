/**
 * Structured Request Logging Middleware
 *
 * Logs all requests in structured JSON format for observability
 *
 * PHASE 6 - Reliability & Observability
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

// =============================================================================
// TYPES
// =============================================================================

interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  userId?: string;
  statusCode?: number;
  responseTimeMs: number;
  contentLength?: number;
}

// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================

/**
 * Request logging middleware
 * - Logs request start
 * - Logs request completion with timing
 * - Structured JSON format for log aggregation
 */
export async function requestLoggerMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();

  // Log request start
  request.log.info({
    type: 'request_start',
    requestId: request.id,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
    userId: (request as any).user?.sub,
  }, 'Incoming request');

  // Hook into response finish to log completion
  reply.raw.on('finish', () => {
    const responseTime = Date.now() - startTime;

    const logData: RequestLogData = {
      requestId: request.id,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.sub,
      statusCode: reply.raw.statusCode,
      responseTimeMs: responseTime,
      contentLength: reply.raw.getHeader('content-length') as number | undefined,
    };

    // Determine log level based on status code
    const statusCode = reply.raw.statusCode || 0;
    const isSuccess = statusCode >= 200 && statusCode < 300;
    const isRedirect = statusCode >= 300 && statusCode < 400;
    const isClientError = statusCode >= 400 && statusCode < 500;
    const isServerError = statusCode >= 500;

    if (isSuccess || isRedirect) {
      request.log.info(logData, 'Request completed');
    } else if (isClientError) {
      request.log.warn(logData, 'Request failed - client error');
    } else if (isServerError) {
      request.log.error(logData, 'Request failed - server error');
    } else {
      request.log.info(logData, 'Request completed');
    }
  });
}

// =============================================================================
// FASTIFY PLUGIN
// =============================================================================

/**
 * Fastify plugin wrapper for request logging middleware
 */
export async function requestLoggerPlugin(
  fastify: any,
  _options: unknown  // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {
  fastify.addHook('onRequest', requestLoggerMiddleware);
}
