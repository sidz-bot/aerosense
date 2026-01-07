/**
 * APNS Service - Mock-Verified Implementation
 *
 * PHASE 8 - iOS Backend Completion
 *
 * This service provides APNS payload formatting and mock delivery verification.
 * NO REAL APNS CONNECTIONS - All operations are DRY-RUN/MOCK only.
 *
 * IMPORTANT: This implementation is for BACKEND COMPLETION only.
 * - No Apple credentials required
 * - No real iOS device needed for verification
 * - All sends are logged as "MOCK-VERIFIED"
 * - Payload formatting follows Apple's APNS specification
 *
 * For production APNS delivery, replace mockSend() with actual APNS provider.
 */

import { logger } from '../utils/logger';

// =============================================================================
// APNS Types - Apple Push Notification Service
// =============================================================================

/**
 * APNS payload structure per Apple specification
 * https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server
 */
export interface APNSPayload {
  aps: {
    alert: APSAlert | string; // Can be string or object
    badge?: number;
    sound?: string | 'default';
    category?: string;
    thread_id?: string;
    content_available?: number; // Set to 1 for silent notifications
    mutable_content?: number; // Set to 1 to allow app extension modification
  };
  // Custom data fields
  [key: string]: unknown;
}

export interface APSAlert {
  title: string;
  body: string;
  title_loc_key?: string;
  title_loc_args?: string[];
  action_loc_key?: string;
  loc_key?: string;
  loc_args?: string[];
  launch_image?: string;
}

export interface APNSNotification {
  userId: string;
  deviceToken: string;
  payload: APNSPayload;
  priority?: number; // 10 = send immediately, 5 = send at convenience
  collapseId?: string; // Coalesce notifications with same ID
  pushType?: 'alert' | 'background' | 'voip' | 'complication' | 'fileprovider';
  expiration?: number; // UNIX epoch timestamp
}

export interface APNSDeliveryResult {
  success: boolean;
  deviceToken: string;
  notificationId: string;
  timestamp: string;
  mode: 'MOCK-VERIFIED';
  payloadSize: number;
  apnsId?: string;
  error?: string;
}

// =============================================================================
// APNS Service - Mock-Verified Implementation
// =============================================================================

class APNSService {
  private readonly MAX_PAYLOAD_SIZE = 4096; // APNS limit in bytes
  private readonly DRY_RUN_MODE = true; // ALWAYS true - no real APNS

  /**
   * Validate APNS payload size and structure
   */
  private validatePayload(payload: APNSPayload): { valid: boolean; error?: string; size: number } {
    try {
      const payloadString = JSON.stringify(payload);
      const sizeBytes = Buffer.byteLength(payloadString, 'utf8');

      if (sizeBytes > this.MAX_PAYLOAD_SIZE) {
        return {
          valid: false,
          error: `Payload size ${sizeBytes} exceeds maximum ${this.MAX_PAYLOAD_SIZE} bytes`,
          size: sizeBytes,
        };
      }

      // Validate required aps field
      if (!payload.aps) {
        return {
          valid: false,
          error: 'Missing required aps field',
          size: sizeBytes,
        };
      }

      // Validate alert
      if (!payload.aps.alert) {
        return {
          valid: false,
          error: 'Missing required aps.alert field',
          size: sizeBytes,
        };
      }

      return { valid: true, size: sizeBytes };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Payload validation failed',
        size: 0,
      };
    }
  }

  /**
   * Build APNS payload from notification data
   */
  buildPayload(params: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    badge?: number;
    sound?: string;
    categoryId?: string;
    threadId?: string;
    contentAvailable?: boolean;
    mutableContent?: boolean;
  }): APNSPayload {
    const {
      title,
      body,
      data = {},
      badge,
      sound = 'default',
      categoryId,
      threadId,
      contentAvailable,
      mutableContent,
    } = params;

    const payload: APNSPayload = {
      aps: {
        alert: {
          title,
          body,
        },
        sound,
      },
      ...data,
    };

    // Optional fields
    if (badge !== undefined) {
      payload.aps.badge = badge;
    }

    if (categoryId) {
      payload.aps.category = categoryId;
    }

    if (threadId) {
      payload.aps.thread_id = threadId;
    }

    if (contentAvailable) {
      payload.aps.content_available = 1;
    }

    if (mutableContent) {
      payload.aps.mutable_content = 1;
    }

    return payload;
  }

  /**
   * Send notification - MOCK-VERIFIED MODE ONLY
   *
   * This function validates the payload and logs what WOULD be sent to APNS.
   * No actual network request is made to Apple's servers.
   *
   * @param notification - The notification to send
   * @returns Promise<APNSDeliveryResult> - Mock delivery result
   */
  async send(notification: APNSNotification): Promise<APNSDeliveryResult> {
    const notificationId = `apns_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logger.info(
      {
        notificationId,
        userId: notification.userId,
        deviceToken: this.maskDeviceToken(notification.deviceToken),
        mode: 'MOCK-VERIFIED',
      },
      'APNSService: [MOCK-VERIFIED] Preparing notification send'
    );

    // Validate payload
    const validation = this.validatePayload(notification.payload);

    if (!validation.valid) {
      logger.error(
        {
          notificationId,
          error: validation.error,
          mode: 'MOCK-VERIFIED',
        },
        'APNSService: [MOCK-VERIFIED] Payload validation failed'
      );

      return {
        success: false,
        deviceToken: notification.deviceToken,
        notificationId,
        timestamp: new Date().toISOString(),
        mode: 'MOCK-VERIFIED',
        payloadSize: validation.size,
        error: validation.error,
      };
    }

    // Log successful validation and mock send
    logger.info(
      {
        notificationId,
        userId: notification.userId,
        deviceToken: this.maskDeviceToken(notification.deviceToken),
        payloadSize: validation.size,
        priority: notification.priority || 10,
        pushType: notification.pushType || 'alert',
        payload: this.sanitizePayload(notification.payload),
        mode: 'MOCK-VERIFIED',
        note: 'NO REAL APNS CONNECTION - DRY RUN ONLY',
      },
      'APNSService: [MOCK-VERIFIED] Notification would be sent to Apple'
    );

    // Mock APNS response
    const mockApnsId = `MOCK_APNS_ID_${notificationId}`;

    return {
      success: true,
      deviceToken: notification.deviceToken,
      notificationId,
      timestamp: new Date().toISOString(),
      mode: 'MOCK-VERIFIED',
      payloadSize: validation.size,
      apnsId: mockApnsId,
    };
  }

  /**
   * Batch send notifications - MOCK-VERIFIED MODE ONLY
   */
  async sendBatch(notifications: APNSNotification[]): Promise<APNSDeliveryResult[]> {
    logger.info(
      {
        count: notifications.length,
        mode: 'MOCK-VERIFIED',
      },
      'APNSService: [MOCK-VERIFIED] Batch send started'
    );

    const results: APNSDeliveryResult[] = [];

    for (const notification of notifications) {
      const result = await this.send(notification);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;

    logger.info(
      {
        total: notifications.length,
        successful: successCount,
        failed: notifications.length - successCount,
        mode: 'MOCK-VERIFIED',
      },
      'APNSService: [MOCK-VERIFIED] Batch send completed'
    );

    return results;
  }

  /**
   * Mask device token for logging (security)
   */
  private maskDeviceToken(token: string): string {
    if (token.length <= 16) {
      return `${token.substring(0, 8)}...`;
    }
    return `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
  }

  /**
   * Sanitize payload for logging (remove sensitive data)
   */
  private sanitizePayload(payload: APNSPayload): Record<string, unknown> {
    const sanitized = {
      aps: {
        alert: typeof payload.aps.alert === 'string'
          ? payload.aps.alert
          : {
              title: payload.aps.alert.title,
              body: payload.aps.alert.body,
            },
        badge: payload.aps.badge,
        sound: payload.aps.sound,
        category: payload.aps.category,
      },
    };

    // Add custom keys (sanitized)
    for (const [key, value] of Object.entries(payload)) {
      if (key !== 'aps') {
        sanitized[key] = typeof value === 'string' && value.length > 50
          ? `${value.substring(0, 50)}...`
          : value;
      }
    }

    return sanitized;
  }

  /**
   * Get service status
   */
  getStatus(): {
    mode: 'MOCK-VERIFIED';
    dryRun: boolean;
    maxPayloadSize: number;
    ready: boolean;
  } {
    return {
      mode: 'MOCK-VERIFIED',
      dryRun: this.DRY_RUN_MODE,
      maxPayloadSize: this.MAX_PAYLOAD_SIZE,
      ready: true,
    };
  }
}

// =============================================================================
// Export Singleton
// =============================================================================

export const apnsService = new APNSService();
