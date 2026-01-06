/**
 * Fastify App Builder
 * PHASE 7 - Testing & Quality Gate
 *
 * Exports a function to build the Fastify app for testing
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';

import { config } from './config';
import { flightRoutes } from './routes/flights.routes';
import { authRoutes } from './routes/auth.routes';
import { notificationRoutes } from './routes/notifications.routes';
import { requestIdPlugin } from './middleware/request-id.middleware';
import { requestLoggerPlugin } from './middleware/request-logger.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export async function build() {
  const fastify = Fastify({
    logger: {
      level: 'silent', // Suppress logs during tests
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(jwt, {
    secret: config.jwtSecret,
  });

  await fastify.register(requestIdPlugin);
  await fastify.register(requestLoggerPlugin);

  // Authentication decorator
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      });
    }
  });

  // Swagger (disabled in tests)
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'AeroSense API',
        version: '1.0.0',
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });

  // Register routes
  await fastify.register(authRoutes, { prefix: '/api/v1' });
  await fastify.register(flightRoutes, { prefix: '/api/v1/flights' });
  await fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' });

  // Error handlers
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler(notFoundHandler);

  return fastify;
}
