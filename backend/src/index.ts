/**
 * AeroSense Backend API Server
 * Main entry point for the application
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
import { flightPollerService } from './services/flight-poller.service';
import { airportService } from './services/airport.service';
import { notificationQueueService } from './services/notification-queue.service';
import { requestIdPlugin } from './middleware/request-id.middleware';
import { requestLoggerPlugin } from './middleware/request-logger.middleware';

// ============================================================================
// CREATE FASTIFY INSTANCE
// ============================================================================

const fastify = Fastify({
  logger: {
    level: config.logging.level,
    transport: config.logging.prettyPrint
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

// ============================================================================
// REGISTER PLUGINS
// ============================================================================

// CORS
fastify.register(cors, {
  origin: config.cors.origin,
  credentials: config.cors.credentials,
});

// JWT Authentication
fastify.register(jwt, {
  secret: config.jwtSecret,
});

// PHASE 6: Request ID middleware - adds X-Request-ID header
fastify.register(requestIdPlugin);

// PHASE 6: Request logging middleware - structured JSON logging
fastify.register(requestLoggerPlugin);

// Authentication decorator - adds request.authenticate hook
fastify.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
  }
});

// Swagger API Documentation
fastify.register(swagger, {
  openapi: {
    info: {
      title: 'AeroSense API',
      description: 'Aviation Intelligence API for Passengers',
      version: '1.0.0',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'flights', description: 'Flight search and tracking endpoints' },
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'notifications', description: 'Device token and notification history endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
});

fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
});

// ============================================================================
// REGISTER ROUTES
// ============================================================================

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  };
});

// API v1 routes
fastify.register(async function (instance) {
  instance.register(flightRoutes, { prefix: '/flights' });
  instance.register(authRoutes);
  instance.register(notificationRoutes, { prefix: '/notifications' });
}, { prefix: '/api/v1' });

// ============================================================================
// ERROR HANDLING
// ============================================================================

fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error);

  const statusCode = error.statusCode || 500;
  const response = {
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      ...(config.nodeEnv === 'development' && { stack: error.stack }),
    },
  };

  reply.code(statusCode).send(response);
});

// ============================================================================
// 404 HANDLER
// ============================================================================

fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
  });
});

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    // Initialize airport cache
    await airportService.preloadCommonAirports();

    // Start flight polling scheduler (Phase 4)
    if (config.nodeEnv !== 'test') {
      flightPollerService.start();
    }

    // Start notification queue service (Phase 5)
    if (config.nodeEnv !== 'test') {
      notificationQueueService.start();
    }

    fastify.log.info(`
╔══════════════════════════════════════════════════════════════╗
║                                                            ║
║     🛫 AeroSense API Server Started                        ║
║                                                            ║
║     Environment: ${config.nodeEnv.padEnd(43)}║
║     URL: http://${config.host}:${config.port}${' '.repeat(26)}║
║     Docs: http://${config.host}:${config.port}/docs${' '.repeat(24)}║
║     Polling: ${config.nodeEnv !== 'test' ? 'Active' : 'Disabled (test mode)'}${' '.repeat(35)}║
║                                                            ║
╚══════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown (PHASE 6: Enhanced with timeout and better logging)
const shutdownTimeoutMs = 10000; // 10 seconds max for graceful shutdown

async function gracefulShutdown(signal: string): Promise<void> {
  const startTime = Date.now();

  fastify.log.info({ signal }, 'PHASE 6: Initiating graceful shutdown...');

  // Create shutdown timeout
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => reject(new Error('Shutdown timeout')), shutdownTimeoutMs);
  });

  try {
    // Stop accepting new connections
    await Promise.race([
      fastify.close(),
      timeoutPromise,
    ]);
    fastify.log.info('HTTP server closed');
  } catch (error) {
    fastify.log.error({ error }, 'Error closing HTTP server');
  }

  // Stop background services
  flightPollerService.stop();
  notificationQueueService.stop();
  fastify.log.info('Background services stopped');

  const duration = Date.now() - startTime;
  fastify.log.info({ durationMs: duration }, 'PHASE 6: Graceful shutdown completed');

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start the server
start();
