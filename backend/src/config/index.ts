/**
 * Application Configuration
 * Aligned with Architecture.md specifications
 *
 * SECURITY: Production environment will fail to start if critical secrets are not set.
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Validate required production environment variables
if (isProduction && !isTest) {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL: Missing required environment variables for production: ${missing.join(', ')}\n` +
      `Set these in your environment or .env file before starting the server.`
    );
  }
}

// Parse CORS origins - always require explicit configuration in production
const parseCorsOrigin = (): string | string[] => {
  const corsOrigin = process.env.CORS_ORIGIN;

  if (!corsOrigin) {
    if (isProduction) {
      throw new Error(
        'CRITICAL: CORS_ORIGIN must be set in production. ' +
        'Use comma-separated list of allowed origins (e.g., "https://aerosense.app,https://www.aerosense.app")'
      );
    }
    // Development: allow localhost with port
    return ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000'];
  }

  // Split by comma and trim whitespace
  return corsOrigin.split(',').map(origin => origin.trim());
};

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // API
  apiVersion: 'v1',
  apiPrefix: '/api',

  // JWT - Security: Fail in production if not set
  jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : 'dev-secret-change-in-production'),
  jwtExpiresIn: '15m',  // Access token expiry
  jwtRefreshExpiresIn: '30d',  // Refresh token expiry

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_TTL || '60', 10),  // 60 second cache TTL (critical for API cost optimization)
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  },

  // PostgreSQL (for future use with Prisma)
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/aerosense',
  },

  // Rate Limiting
  rateLimit: {
    free: 100,      // 100 requests/hour for free tier
    premium: 1000,  // 1000 requests/hour for premium
    windowMs: 60 * 60 * 1000,  // 1 hour
  },

  // Flight Data
  flightData: {
    refreshInterval: 60,  // seconds
    maxTrackedFlights: {
      free: 5,
      premium: Infinity,
    },
  },

  // FlightAware API
  flightAware: {
    apiKey: process.env.FLIGHTAWARE_API_KEY || '',
    apiBase: process.env.FLIGHTAWARE_API_BASE || 'https://aeroapi.flightaware.com/aeroapi',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
  },

  // CORS - Security: No wildcard in production
  cors: {
    origin: parseCorsOrigin(),
    credentials: true,
  },
} as const;

export type Config = typeof config;
