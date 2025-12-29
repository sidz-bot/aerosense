/**
 * User Domain Types
 *
 * Type definitions for user authentication, registration, and profile data.
 */

import { z } from 'zod';

// =============================================================================
// DTOs (Data Transfer Objects)
// =============================================================================

/**
 * Registration request schema
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login request schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Refresh token request schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Update profile request schema
 */
export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Update notification preferences schema
 */
export const updateNotificationPrefsSchema = z.object({
  notificationEnabled: z.boolean().optional(),
  gateChangeAlerts: z.boolean().optional(),
  delayAlerts: z.boolean().optional(),
  boardingAlerts: z.boolean().optional(),
  connectionRiskAlerts: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>;

// =============================================================================
// Response Types
// =============================================================================

/**
 * Auth response (tokens + user info)
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    emailVerified: boolean;
  };
}

/**
 * User profile response
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
  notificationEnabled: boolean;
  gateChangeAlerts: boolean;
  delayAlerts: boolean;
  boardingAlerts: boolean;
  connectionRiskAlerts: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * Notification preferences response
 */
export interface NotificationPreferences {
  notificationEnabled: boolean;
  gateChangeAlerts: boolean;
  delayAlerts: boolean;
  boardingAlerts: boolean;
  connectionRiskAlerts: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

// =============================================================================
// JWT Payload
// =============================================================================

/**
 * JWT access token payload
 */
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  type: 'access';
  iat: number;
  exp: number;
}

/**
 * JWT refresh token payload
 */
export interface RefreshTokenPayload {
  sub: string; // user ID
  type: 'refresh';
  iat: number;
  exp: number;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Auth error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
}

/**
 * Auth error (custom error class)
 */
export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
