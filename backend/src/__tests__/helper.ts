/**
 * Test Helper
 * PHASE 7 - Testing & Quality Gate
 *
 * Provides helper functions for integration tests
 */

import type { FastifyInstance } from 'fastify';
import { build } from '../app';

export async function setupTestApp(): Promise<FastifyInstance> {
  const app = await build();

  // Add error handling for tests
  app.setErrorHandler((_error: any, _request: any, reply: any) => {
    reply.send({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: 'Test error',
      },
    });
  });

  return app;
}

export async function teardownTestApp(app: FastifyInstance): Promise<void> {
  await app.close();
}
