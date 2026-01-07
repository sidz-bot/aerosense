/**
 * Notification Queue Service
 *
 * In-memory queue for processing notifications asynchronously
 *
 * PHASE 5 - Notification System (Mock Delivery Only)
 * PHASE 8 - iOS Backend Completion (Mock-Verified APNS Integration)
 *
 * This service now integrates with the APNS service for proper iOS payload formatting
 * and mock-verified delivery tracking.
 */

import { createNotification, getUserDeviceTokens, updateNotificationDelivery } from '../utils/database-helpers';
import { logger } from '../utils/logger';
import { NotificationType } from '@prisma/client';
import { apnsService } from './apns.service';
import { buildNotificationPayload } from '../types/notification.types';

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationJob {
  id: string;
  userId: string;
  flightId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
}

type NotificationHandler = (job: NotificationJob) => Promise<void>;

// =============================================================================
// NOTIFICATION QUEUE SERVICE
// =============================================================================

class NotificationQueueService {
  private queue: NotificationJob[] = [];
  private handlers: Map<NotificationType, NotificationHandler> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private concurrentJobs = 0;
  private maxConcurrentJobs = 5;

  constructor() {
    // Register default handlers
    this.registerDefaultHandlers();
  }

  /**
   * Register a notification handler for a specific type
   */
  registerHandler(type: NotificationType, handler: NotificationHandler): void {
    this.handlers.set(type, handler);
    logger.info({ type }, 'NotificationQueue: handler registered');
  }

  /**
   * Add a notification to the queue
   */
  enqueue(job: Omit<NotificationJob, 'id' | 'createdAt'>): string {
    const notificationJob: NotificationJob = {
      ...job,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
    };

    // Sort by priority (high first)
    if (job.priority === 'high') {
      this.queue.unshift(notificationJob);
    } else {
      this.queue.push(notificationJob);
    }

    logger.info(
      {
        notificationId: notificationJob.id,
        type: job.type,
        userId: job.userId,
        queueSize: this.queue.length,
      },
      'NotificationQueue: notification enqueued'
    );

    return notificationJob.id;
  }

  /**
   * Start processing the queue
   */
  start(): void {
    if (this.isProcessing) {
      logger.warn('NotificationQueue: already processing');
      return;
    }

    this.isProcessing = true;
    logger.info('NotificationQueue: started processing');

    // Process queue every 2 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 2000);
  }

  /**
   * Stop processing the queue
   */
  stop(): void {
    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.info('NotificationQueue: stopped processing');
  }

  /**
   * Clear the queue (for testing purposes)
   */
  clear(): void {
    this.queue = [];
    this.concurrentJobs = 0;
  }

  /**
   * Process pending notifications in the queue
   */
  private async processQueue(): Promise<void> {
    // Skip if we're at max concurrency or queue is empty
    if (this.concurrentJobs >= this.maxConcurrentJobs || this.queue.length === 0) {
      return;
    }

    // Process up to maxConcurrentJobs jobs
    const jobsToProcess = this.queue.splice(0, this.maxConcurrentJobs - this.concurrentJobs);

    for (const job of jobsToProcess) {
      this.concurrentJobs++;

      // Process asynchronously without awaiting
      this.processJob(job).finally(() => {
        this.concurrentJobs--;
      });
    }
  }

  /**
   * Process a single notification job
   */
  private async processJob(job: NotificationJob): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info(
        {
          notificationId: job.id,
          type: job.type,
          userId: job.userId,
        },
        'NotificationQueue: processing notification'
      );

      // Get the handler for this notification type
      const handler = this.handlers.get(job.type);

      if (!handler) {
        logger.warn(
          { notificationId: job.id, type: job.type },
          'NotificationQueue: no handler registered, using default'
        );
        await this.defaultHandler(job);
      } else {
        await handler(job);
      }

      const duration = Date.now() - startTime;
      logger.info(
        {
          notificationId: job.id,
          type: job.type,
          durationMs: duration,
        },
        'NotificationQueue: notification processed'
      );
    } catch (error) {
      logger.error(
        {
          notificationId: job.id,
          type: job.type,
          error,
        },
        'NotificationQueue: failed to process notification'
      );
    }
  }

  /**
   * Default notification handler
   * PHASE 8 - Enhanced with APNS payload formatting and delivery tracking
   *
   * Flow:
   * 1. Build APNS payload with proper iOS formatting
   * 2. Persist notification to database
   * 3. Fetch user device tokens
   * 4. Send via APNS service (mock-verified mode)
   * 5. Update delivery tracking
   */
  private async defaultHandler(job: NotificationJob): Promise<void> {
    // Extract flight info from data for payload building
    const airlineCode = (job.data?.airlineCode as string) || 'UNKNOWN';
    const flightNumber = (job.data?.flightNumber as string) || '0000';

    // 1. Build APNS payload with proper iOS formatting
    const payloadParams = buildNotificationPayload({
      type: job.type,
      flightId: job.flightId,
      airlineCode,
      flightNumber,
      data: job.data,
    });

    const apnsPayload = apnsService.buildPayload(payloadParams);

    // 2. Persist notification to database (PENDING status)
    const notificationRecord = await createNotification({
      userId: job.userId,
      flightId: job.flightId,
      type: job.type,
      title: job.title,
      body: job.body,
      data: job.data,
    });

    logger.info(
      {
        notificationId: notificationRecord.id,
        queueJobId: job.id,
        type: job.type,
        userId: job.userId,
        status: 'PENDING',
      },
      'NotificationQueue: notification persisted to database'
    );

    // 3. Fetch user device tokens
    const deviceTokens = await getUserDeviceTokens(job.userId);

    if (deviceTokens.length === 0) {
      logger.warn(
        {
          notificationId: notificationRecord.id,
          userId: job.userId,
        },
        'NotificationQueue: no device tokens found for user, skipping APNS send'
      );

      // Update status to indicate no devices
      await updateNotificationDelivery({
        notificationId: notificationRecord.id,
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: 'No device tokens registered',
      });
      return;
    }

    // 4. Send via APNS service (MOCK-VERIFIED mode)
    logger.info(
      {
        notificationId: notificationRecord.id,
        deviceCount: deviceTokens.length,
        mode: 'MOCK-VERIFIED',
      },
      'NotificationQueue: sending to APNS service'
    );

    const now = new Date();
    let allSuccessful = true;
    let failureReason: string | undefined;

    for (const deviceToken of deviceTokens) {
      // Only send to iOS devices
      if (deviceToken.platform !== 'ios') {
        logger.info(
          {
            notificationId: notificationRecord.id,
            platform: deviceToken.platform,
          },
          'NotificationQueue: skipping non-iOS device'
        );
        continue;
      }

      const result = await apnsService.send({
        userId: job.userId,
        deviceToken: deviceToken.token,
        payload: apnsPayload,
        priority: 10, // Send immediately
        pushType: 'alert',
      });

      if (result.success) {
        logger.info(
          {
            notificationId: notificationRecord.id,
            deviceToken: deviceToken.token.substring(0, 16) + '...',
            apnsId: result.apnsId,
            payloadSize: result.payloadSize,
            mode: result.mode,
          },
          'NotificationQueue: [MOCK-VERIFIED] APNS send successful'
        );
      } else {
        allSuccessful = false;
        failureReason = result.error || 'Unknown APNS error';
        logger.error(
          {
            notificationId: notificationRecord.id,
            error: failureReason,
          },
          'NotificationQueue: APNS send failed'
        );
      }
    }

    // 5. Update delivery tracking in database
    if (allSuccessful) {
      await updateNotificationDelivery({
        notificationId: notificationRecord.id,
        status: 'SENT',
        sentAt: now,
        // In mock mode, we mark as delivered immediately
        // In production, this would be updated via APNS feedback service
        deliveredAt: now,
      });
    } else {
      await updateNotificationDelivery({
        notificationId: notificationRecord.id,
        status: 'FAILED',
        sentAt: now,
        failedAt: now,
        failureReason,
      });
    }

    logger.info(
      {
        notificationId: notificationRecord.id,
        status: allSuccessful ? 'SENT' : 'FAILED',
        devicesProcessed: deviceTokens.length,
      },
      'NotificationQueue: notification processing complete'
    );
  }

  /**
   * Register default notification handlers
   */
  private registerDefaultHandlers(): void {
    // Gate change handler
    this.registerHandler(NotificationType.GATE_CHANGE, async (job) => {
      await this.defaultHandler(job);
      logger.info(
        { notificationId: job.id, gate: job.data?.newGate },
        'NotificationQueue: gate change notification handled'
      );
    });

    // Delay handler
    this.registerHandler(NotificationType.DELAY, async (job) => {
      await this.defaultHandler(job);
      logger.info(
        { notificationId: job.id, delayMinutes: job.data?.delayMinutes },
        'NotificationQueue: delay notification handled'
      );
    });

    // Cancellation handler
    this.registerHandler(NotificationType.FLIGHT_CANCELED, async (job) => {
      await this.defaultHandler(job);
      logger.info(
        { notificationId: job.id },
        'NotificationQueue: flight canceled notification handled'
      );
    });

    // Connection risk handler
    this.registerHandler(NotificationType.CONNECTION_RISK, async (job) => {
      await this.defaultHandler(job);
      logger.info(
        { notificationId: job.id, riskLevel: job.data?.riskLevel },
        'NotificationQueue: connection risk notification handled'
      );
    });

    // Boarding soon handler
    this.registerHandler(NotificationType.BOARDING_SOON, async (job) => {
      await this.defaultHandler(job);
      logger.info(
        { notificationId: job.id },
        'NotificationQueue: boarding soon notification handled'
      );
    });

    // Connection status change handler
    this.registerHandler(NotificationType.CONNECTION_STATUS_CHANGE, async (job) => {
      await this.defaultHandler(job);
      logger.info(
        { notificationId: job.id, previousRisk: job.data?.previousRisk, currentRisk: job.data?.currentRisk },
        'NotificationQueue: connection status change notification handled'
      );
    });
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueSize: number;
    isProcessing: boolean;
    concurrentJobs: number;
  } {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      concurrentJobs: this.concurrentJobs,
    };
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const notificationQueueService = new NotificationQueueService();

// Export enqueue helper for convenience
export function enqueueNotification(
  job: Omit<NotificationJob, 'id' | 'createdAt'>
): string {
  return notificationQueueService.enqueue(job);
}
