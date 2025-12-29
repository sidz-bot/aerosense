/**
 * Fastify Type Augmentations
 *
 * Extends Fastify with custom decorators and properties
 */

import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Authentication decorator
     * Verifies JWT token and adds user payload to request
     */
    authenticate: (request: FastifyRequest, reply: any) => Promise<void>;
  }

  interface FastifyRequest {
    /**
     * User payload from JWT token
     * Added after successful authentication
     */
    user?: {
      sub: string; // user ID
      email: string;
      role: string;
      type: 'access' | 'refresh';
    };
  }
}
