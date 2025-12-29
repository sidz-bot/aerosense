/**
 * Database Client Utility
 *
 * Provides a singleton Prisma client instance with connection pooling,
 * logging, and graceful shutdown handling.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

/**
 * Prisma client singleton with logging configuration
 */
class DatabaseClient {
  private static instance: PrismaClient | null = null;

  /**
   * Get or create the Prisma client instance
   */
  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
      });

      // Log queries in development for debugging
      if (process.env.NODE_ENV === 'development') {
        this.instance.$use(async (params, next) => {
          const before = Date.now();
          const result = await next(params);
          const after = Date.now();
          const time = after - before;

          logger.debug({
            model: params.model,
            action: params.action,
            duration: `${time}ms`,
          }, 'Database query executed');

          return result;
        });
      }

      // Handle shutdown gracefully
      this.setupShutdownHandlers();
    }

    return this.instance;
  }

  /**
   * Disconnect from database
   */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      logger.info('Database disconnected');
    }
  }

  /**
   * Setup shutdown handlers for graceful disconnection
   */
  private static setupShutdownHandlers(): void {
    const cleanup = async () => {
      await this.disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }

  /**
   * Check database connectivity
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await this.instance!.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error({ error }, 'Database health check failed');
      return false;
    }
  }

  /**
   * Get database connection info
   */
  static async getConnectionInfo(): Promise<{
    maxConnections: number;
    openConnections: number;
  }> {
    try {
      const result = await this.instance!.$queryRaw<
        { max_connections: string; current_connections: string }[]
      >`
      SELECT
        setting::int AS max_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS current_connections
      FROM pg_settings
      WHERE name = 'max_connections'
    `;

      return {
        maxConnections: parseInt(result[0]?.max_connections || '0'),
        openConnections: parseInt(result[0]?.current_connections || '0'),
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get connection info');
      return { maxConnections: 0, openConnections: 0 };
    }
  }
}

// Export singleton instance
export const db = DatabaseClient.getInstance();

// Export utility functions
export const disconnectDatabase = () => DatabaseClient.disconnect();
export const healthCheck = () => DatabaseClient.healthCheck();
export const getConnectionInfo = () => DatabaseClient.getConnectionInfo();
