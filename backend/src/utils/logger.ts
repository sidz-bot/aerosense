/**
 * Logger Utility
 *
 * Structured JSON logging using Pino
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Pino logger instance
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Log HTTP request
 */
export function logRequest({
  method,
  url,
  statusCode,
  duration,
  requestId,
}: {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestId?: string;
}) {
  logger.info(
    {
      type: 'http_request',
      method,
      url,
      status_code: statusCode,
      duration_ms: duration,
      request_id: requestId,
    },
    `${method} ${url} ${statusCode}`
  );
}

/**
 * Log HTTP error
 */
export function logError({
  error,
  method,
  url,
  requestId,
}: {
  error: unknown;
  method: string;
  url: string;
  requestId?: string;
}) {
  logger.error(
    {
      type: 'http_error',
      method,
      url,
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    },
    `${method} ${url} - Error`
  );
}
