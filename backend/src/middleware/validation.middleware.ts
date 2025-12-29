/**
 * Validation Middleware
 *
 * Request validation using Zod schemas
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError, ZodSchema } from 'zod';
import { errorHandler } from './error.middleware';

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Validate request body against Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        errorHandler(error as any, request, reply);
        throw error; // Re-throw to prevent further execution
      }
      throw error;
    }
  };
}

/**
 * Validate request query parameters against Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        errorHandler(error as any, request, reply);
        throw error;
      }
      throw error;
    }
  };
}

/**
 * Validate request parameters against Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof ZodError) {
        errorHandler(error as any, request, reply);
        throw error;
      }
      throw error;
    }
  };
}

/**
 * Validate request headers against Zod schema
 */
export function validateHeaders<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.headers = schema.parse(request.headers);
    } catch (error) {
      if (error instanceof ZodError) {
        errorHandler(error as any, request, reply);
        throw error;
      }
      throw error;
    }
  };
}
