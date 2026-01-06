/**
 * Retry Utility with Exponential Backoff
 *
 * Provides retry logic for external API calls with exponential backoff
 *
 * PHASE 6 - Reliability & Observability
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface RetryOptions {
  maxAttempts?: number;        // Maximum number of retry attempts (default: 3)
  initialDelayMs?: number;     // Initial delay before first retry (default: 1000)
  maxDelayMs?: number;         // Maximum delay between retries (default: 10000)
  backoffMultiplier?: number;  // Multiplier for exponential backoff (default: 2)
  retryableErrors?: (error: unknown) => boolean;  // Function to determine if error is retryable
  onRetry?: (attempt: number, error: unknown) => void;  // Callback on each retry
}

export interface RetryResult<T> {
  data: T;
  attempts: number;  // Number of attempts made
  totalDelayMs: number;  // Total time spent in delays
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: (error: unknown) => {
    // By default, retry on network errors and 5xx errors
    if (error instanceof Error) {
      // Network errors (no response)
      if (error.name === 'TypeError' || error.message.includes('ECONNREFUSED')) {
        return true;
      }
      // HTTP 5xx errors
      if (error.message.includes('500') || error.message.includes('502') ||
          error.message.includes('503') || error.message.includes('504')) {
        return true;
      }
      // Timeout errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return true;
      }
    }
    return false;
  },
  onRetry: (attempt: number, error: unknown) => {
    logger.warn({ attempt, error }, 'Retrying request due to error');
  },
};

// =============================================================================
// RETRY FUNCTION
// =============================================================================

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry (should return a Promise)
 * @param options - Retry configuration options
 * @returns Promise with result and attempt count
 *
 * @example
 * const result = await retry(() => fetch('https://api.example.com'), {
 *   maxAttempts: 3,
 *   initialDelayMs: 1000,
 * });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: unknown;
  let totalDelay = 0;
  let currentDelay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        data,
        attempts: attempt,
        totalDelayMs: totalDelay,
      };
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        // Not retryable, throw immediately
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === opts.maxAttempts) {
        logger.error(
          { attempt: opts.maxAttempts, error: lastError },
          'Max retry attempts reached'
        );
        throw lastError;
      }

      // Call retry callback
      opts.onRetry(attempt, error);

      // Wait before retrying
      await sleep(currentDelay);
      totalDelay += currentDelay;

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(
        currentDelay * opts.backoffMultiplier,
        opts.maxDelayMs
      );
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// PREDEFINED RETRY STRATEGIES
// =============================================================================

/**
 * Retry strategy for HTTP requests (retries 5xx errors)
 */
export function httpRetryableErrors(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.name === 'TypeError' || error.message.includes('ECONNREFUSED')) {
      return true;
    }
    // HTTP 5xx errors (server errors)
    if (/5\d\d/.test(error.message)) {
      return true;
    }
    // Timeout errors
    if (error.message.includes('timeout')) {
      return true;
    }
  }
  return false;
}

/**
 * Retry strategy for database connections
 */
export function databaseRetryableErrors(error: unknown): boolean {
  if (error instanceof Error) {
    // Connection errors
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('connection') ||
        error.message.includes('timeout')) {
      return true;
    }
  }
  return false;
}

// =============================================================================
// PREDEFINED CONFIGURATIONS
// =============================================================================

/**
 * Aggressive retry strategy for critical operations
 */
export const AGGRESSIVE_RETRY: Required<RetryOptions> = {
  ...DEFAULT_RETRY_OPTIONS,
  maxAttempts: 5,
  initialDelayMs: 500,
  backoffMultiplier: 1.5,
};

/**
 * Conservative retry strategy for non-critical operations
 */
export const CONSERVATIVE_RETRY: Required<RetryOptions> = {
  ...DEFAULT_RETRY_OPTIONS,
  maxAttempts: 2,
  initialDelayMs: 2000,
  backoffMultiplier: 2,
};

/**
 * No retry strategy for idempotent operations
 */
export const NO_RETRY: Required<RetryOptions> = {
  ...DEFAULT_RETRY_OPTIONS,
  maxAttempts: 1,
};
