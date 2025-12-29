/**
 * User Service
 *
 * Business logic for user authentication, registration, and profile management.
 */

import bcrypt from 'bcrypt';
import { jwtSign, jwtVerify } from '../utils/jwt';
import { db, findUserByEmail, findUserById } from '../utils/database-helpers';
import { logger } from '../utils/logger';
import type {
  RegisterInput,
  LoginInput,
  AuthResponse,
  UserProfile,
  NotificationPreferences,
  UpdateNotificationPrefsInput,
} from '../types/user.types';
import { AuthError, AuthErrorCode } from '../types/user.types';

// =============================================================================
// Constants
// =============================================================================

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRES_IN = '1h'; // 1 hour
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

// =============================================================================
// Registration
// =============================================================================

/**
 * Register a new user with email/password
 */
export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const { email, password, name } = input;

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AuthError(
      AuthErrorCode.USER_EXISTS,
      'A user with this email already exists',
      409
    );
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || null,
      role: 'FREE',
      emailVerified: false, // Would send verification email in production
    },
  });

  // Generate tokens
  const accessToken = await jwtSign({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  }, ACCESS_TOKEN_EXPIRES_IN);

  const refreshToken = await jwtSign({
    sub: user.id,
    type: 'refresh',
  }, REFRESH_TOKEN_EXPIRES_IN);

  // Store refresh token
  await db.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  logger.info({ userId: user.id, email: user.email }, 'User registered');

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1 hour in seconds
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  };
}

// =============================================================================
// Authentication
// =============================================================================

/**
 * Login user with email/password
 */
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const { email, password } = input;

  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AuthError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Invalid email or password',
      401
    );
  }

  // Check if user has password (OAuth-only users don't)
  if (!user.password) {
    throw new AuthError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Please sign in with your OAuth provider',
      400
    );
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new AuthError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Invalid email or password',
      401
    );
  }

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const accessToken = await jwtSign({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  }, ACCESS_TOKEN_EXPIRES_IN);

  const refreshToken = await jwtSign({
    sub: user.id,
    type: 'refresh',
  }, REFRESH_TOKEN_EXPIRES_IN);

  // Store refresh token
  await db.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  logger.info({ userId: user.id, email: user.email }, 'User logged in');

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1 hour in seconds
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  // Verify token (handled by middleware, extract user ID)
  const payload = await jwtVerify(refreshToken) as { sub: string; type: string };

  if (payload.type !== 'refresh') {
    throw new AuthError(
      AuthErrorCode.INVALID_TOKEN,
      'Invalid token type',
      401
    );
  }

  // Find user
  const user = await findUserById(payload.sub);
  if (!user || user.refreshToken !== refreshToken) {
    throw new AuthError(
      AuthErrorCode.INVALID_TOKEN,
      'Invalid refresh token',
      401
    );
  }

  // Generate new access token
  const accessToken = await jwtSign({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  }, ACCESS_TOKEN_EXPIRES_IN);

  logger.info({ userId: user.id }, 'Access token refreshed');

  return {
    accessToken,
    expiresIn: 3600,
  };
}

/**
 * Logout user (invalidate refresh token)
 */
export async function logoutUser(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  logger.info({ userId }, 'User logged out');
}

// =============================================================================
// Profile
// =============================================================================

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AuthError(
      AuthErrorCode.USER_NOT_FOUND,
      'User not found',
      404
    );
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emailVerified: user.emailVerified,
    notificationEnabled: user.notificationEnabled,
    gateChangeAlerts: user.gateChangeAlerts,
    delayAlerts: user.delayAlerts,
    boardingAlerts: user.boardingAlerts,
    connectionRiskAlerts: user.connectionRiskAlerts,
    quietHoursStart: user.quietHoursStart,
    quietHoursEnd: user.quietHoursEnd,
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  input: UpdateNotificationPrefsInput
): Promise<NotificationPreferences> {
  const user = await db.user.update({
    where: { id: userId },
    data: input,
  });

  logger.info({ userId, input }, 'Notification preferences updated');

  return {
    notificationEnabled: user.notificationEnabled,
    gateChangeAlerts: user.gateChangeAlerts,
    delayAlerts: user.delayAlerts,
    boardingAlerts: user.boardingAlerts,
    connectionRiskAlerts: user.connectionRiskAlerts,
    quietHoursStart: user.quietHoursStart,
    quietHoursEnd: user.quietHoursEnd,
  };
}

/**
 * Delete user account
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  // Cascade delete will remove related records
  await db.user.delete({
    where: { id: userId },
  });

  logger.info({ userId }, 'User account deleted');
}
