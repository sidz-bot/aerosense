/**
 * Request ID Middleware
 *
 * Generates and propagates request IDs for distributed tracing
 *
 * PHASE 6 - Reliability & Observability
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    id: string;
  }
}

// =============================================================================
// REQUEST ID MIDDLEWARE
// =============================================================================

/**
 * Request ID middleware
 * - Generates UUID for each request
 * - Supports incoming X-Request-ID header for distributed tracing
 * - Adds request ID to response headers
 */
export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Check for existing request ID (from upstream service)
  const existingRequestId = request.headers['x-request-id'] as string | undefined;

  // Generate new ID if not present
  const requestId = existingRequestId || randomUUID();

  // Attach to request
  request.id = requestId;

  // Add to response headers for tracing
  reply.header('X-Request-ID', requestId);
}

// =============================================================================
// FASTIFY PLUGIN
// =============================================================================

/**
 * Fastify plugin wrapper for request ID middleware
 */
export async function requestIdPlugin(
  fastify: any,
  _options: unknown  // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {
  fastify.addHook('onRequest', requestIdMiddleware);
}
