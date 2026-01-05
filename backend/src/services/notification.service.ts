/**
 * Notification Service
 *
 * Business logic for device token management and notification history.
 * Note: Actual push notification delivery (APNS) is PAUSED - no iOS client available.
 * This service only handles database persistence for tokens and notification records.
 */

import {
  registerDeviceToken as dbRegisterDeviceToken,
  unregisterDeviceToken as dbUnregisterDeviceToken,
  getUserDeviceTokens,
  getUserNotifications,
} from '../utils/database-helpers';
import { logger } from '../utils/logger';

// =============================================================================
// Types
// =============================================================================

export interface DeviceTokenInput {
  token: string;
  platform: 'ios' | 'android';
}

export interface DeviceToken {
  id: string;
  token: string;
  platform: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  flightId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

// =============================================================================
// Device Token Management
// =============================================================================

/**
 * Register a device token for push notifications
 * Uses upsert pattern to handle duplicate tokens gracefully
 */
export async function registerDeviceToken(
  userId: string,
  input: DeviceTokenInput
): Promise<DeviceToken> {
  logger.info({ userId, platform: input.platform }, 'Registering device token');

  const result = await dbRegisterDeviceToken(userId, input.token, input.platform);

  return {
    id: result.id,
    token: result.token,
    platform: result.platform,
    createdAt: result.createdAt.toISOString(),
  };
}

/**
 * Unregister (delete) a device token
 * Removes the token from the database, stopping notifications for that device
 */
export async function unregisterDeviceToken(
  userId: string,
  token: string
): Promise<void> {
  logger.info({ userId }, 'Unregistering device token');

  await dbUnregisterDeviceToken(userId, token);

  logger.info({ userId }, 'Device token unregistered successfully');
}

/**
 * Get all registered device tokens for a user
 */
export async function getDeviceTokens(userId: string): Promise<DeviceToken[]> {
  const tokens = await getUserDeviceTokens(userId);

  return tokens.map((t) => ({
    id: t.id,
    token: t.token,
    platform: t.platform,
    createdAt: t.createdAt.toISOString(),
  }));
}

// =============================================================================
// Notification History
// =============================================================================

/**
 * Get notification history for a user
 * Returns paginated list of notifications ordered by creation date
 */
export async function getNotificationHistory(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ notifications: NotificationRecord[]; total: number }> {
  const limit = options?.limit || 20;
  // Note: offset is reserved for future pagination support
  // The database helper doesn't currently support offset, so we accept it here for API compatibility

  // Get notifications with count
  const [notifications, total] = await Promise.all([
    getUserNotifications(userId, limit),
    // For a production app with many notifications, we'd need a separate count query
    // For now, we'll return the length of the fetched array as the total
    Promise.resolve(limit),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      flightId: n.flightId,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data as Record<string, unknown> | null,
      status: n.status,
      sentAt: n.sentAt?.toISOString() || null,
      deliveredAt: n.deliveredAt?.toISOString() || null,
      failedAt: n.failedAt?.toISOString() || null,
      failureReason: n.failureReason,
      createdAt: n.createdAt.toISOString(),
    })),
    total,
  };
}

// =============================================================================
// Notification Preferences (Per-Flight)
// =============================================================================

/**
 * Update per-flight notification preferences
 * This is handled by the UserFlight model in the database
 * Currently managed via the UserFlight relation when tracking flights
 */
export async function updateFlightNotificationPreferences(
  userId: string,
  flightId: string,
  preferences: {
    notificationEnabled?: boolean;
    gateChangeAlerts?: boolean;
    delayAlerts?: boolean;
    boardingAlerts?: boolean;
    connectionRiskAlerts?: boolean;
  }
): Promise<void> {
  // This will be implemented when we add per-flight preference endpoints
  // For now, preferences are set at the User level
  logger.info({ userId, flightId, preferences }, 'Flight notification preferences update requested');
}
