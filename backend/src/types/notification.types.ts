/**
 * Notification Types
 *
 * Type definitions for the notification system.
 * Includes APNS-specific types for iOS push notifications.
 */

// =============================================================================
// Re-export APNS Types
// =============================================================================

export type {
  APNSPayload,
  APSAlert,
  APNSNotification,
  APNSDeliveryResult,
} from '../services/apns.service';

// =============================================================================
// Notification Configuration Types
// =============================================================================

/**
 * Notification category identifiers for iOS
 * Used for interactive notification actions
 */
export enum NotificationCategory {
  FLIGHT_UPDATE = 'FLIGHT_UPDATE',
  GATE_CHANGE = 'GATE_CHANGE',
  DELAY_ALERT = 'DELAY_ALERT',
  BOARDING = 'BOARDING',
  CONNECTION_RISK = 'CONNECTION_RISK',
  CANCELLATION = 'CANCELLATION',
}

/**
 * Notification thread identifiers for grouping
 * Notifications with the same thread_id are grouped in iOS
 */
export interface NotificationThreadId {
  flightId(flightId: string): string;
  connection(flightId: string, connectedFlightId: string): string;
}

export const notificationThreadId: NotificationThreadId = {
  flightId: (flightId: string) => `flight_${flightId}`,
  connection: (flightId: string, connectedFlightId: string) =>
    `connection_${flightId}_${connectedFlightId}`,
};

// =============================================================================
// Notification Payload Builders
// =============================================================================

/**
 * Build notification parameters for different event types
 */
export interface NotificationPayloadParams {
  type: 'GATE_CHANGE' | 'DELAY' | 'BOARDING_SOON' | 'CONNECTION_RISK' | 'CONNECTION_STATUS_CHANGE' | 'FLIGHT_CANCELED';
  flightId: string;
  airlineCode: string;
  flightNumber: string;
  data?: Record<string, unknown>;
}

export interface BuiltNotificationPayload {
  title: string;
  body: string;
  data: Record<string, unknown>;
  badge?: number;
  sound?: string;
  categoryId?: NotificationCategory;
  threadId?: string;
}

/**
 * Build notification payload based on event type
 */
export function buildNotificationPayload(
  params: NotificationPayloadParams
): BuiltNotificationPayload {
  const { type, flightId, airlineCode, flightNumber, data = {} } = params;

  const baseData = {
    flightId,
    airlineCode,
    flightNumber,
    ...data,
  };

  switch (type) {
    case 'GATE_CHANGE': {
      const newGate = (data as { newGate?: string }).newGate;
      return {
        title: 'Gate Changed',
        body: `Your flight ${airlineCode}${flightNumber} is now departing from Gate ${newGate || 'TBD'}.`,
        data: baseData,
        categoryId: NotificationCategory.GATE_CHANGE,
        threadId: notificationThreadId.flightId(flightId),
        sound: 'gate_change.caf',
      };
    }

    case 'DELAY': {
      const delayMinutes = (data as { delayMinutes?: number }).delayMinutes || 0;
      return {
        title: 'Flight Delayed',
        body: `Flight ${airlineCode}${flightNumber} is delayed by ${delayMinutes} minutes.`,
        data: baseData,
        categoryId: NotificationCategory.DELAY_ALERT,
        threadId: notificationThreadId.flightId(flightId),
        sound: 'default',
      };
    }

    case 'BOARDING_SOON': {
      return {
        title: 'Boarding Soon',
        body: `Flight ${airlineCode}${flightNumber} will begin boarding shortly.`,
        data: baseData,
        categoryId: NotificationCategory.BOARDING,
        threadId: notificationThreadId.flightId(flightId),
        sound: 'boarding.caf',
      };
    }

    case 'CONNECTION_RISK': {
      const riskLevel = (data as { riskLevel?: string }).riskLevel || 'UNKNOWN';
      return {
        title: 'Connection at Risk',
        body: `Your connecting flight may be at risk due to delays. Current risk level: ${riskLevel}.`,
        data: baseData,
        categoryId: NotificationCategory.CONNECTION_RISK,
        threadId: notificationThreadId.flightId(flightId),
        sound: 'default',
      };
    }

    case 'CONNECTION_STATUS_CHANGE': {
      const previousRisk = (data as { previousRisk?: string }).previousRisk || 'UNKNOWN';
      const currentRisk = (data as { currentRisk?: string }).currentRisk || 'UNKNOWN';
      return {
        title: 'Connection Status Updated',
        body: `Connection risk changed from ${previousRisk} to ${currentRisk}.`,
        data: baseData,
        categoryId: NotificationCategory.CONNECTION_RISK,
        threadId: notificationThreadId.flightId(flightId),
        sound: 'default',
      };
    }

    case 'FLIGHT_CANCELED': {
      return {
        title: 'Flight Canceled',
        body: `Flight ${airlineCode}${flightNumber} has been canceled. Please check for rebooking options.`,
        data: baseData,
        categoryId: NotificationCategory.CANCELLATION,
        threadId: notificationThreadId.flightId(flightId),
        sound: 'default',
      };
    }

    default:
      return {
        title: 'Flight Update',
        body: `There's an update for flight ${airlineCode}${flightNumber}.`,
        data: baseData,
        categoryId: NotificationCategory.FLIGHT_UPDATE,
        threadId: notificationThreadId.flightId(flightId),
        sound: 'default',
      };
  }
}
