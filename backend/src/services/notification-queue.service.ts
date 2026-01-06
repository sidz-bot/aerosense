/**
 * Notification Queue Service
 *
 * In-memory queue for processing notifications asynchronously
 * Mock delivery - logs notifications instead of sending to APNS
 *
 * PHASE 5 - Notification System (Mock Delivery Only)
 */

import { createNotification } from '../utils/database-helpers';
import { logger } from '../utils/logger';
import { NotificationType } from '@prisma/client';

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
   * - Persists to database
   * - Logs delivery (mock)
   */
  private async defaultHandler(job: NotificationJob): Promise<void> {
    // 1. Persist notification to database
    await createNotification({
      userId: job.userId,
      flightId: job.flightId,
      type: job.type,
      title: job.title,
      body: job.body,
      data: job.data,
    });

    // 2. Mock delivery - log instead of sending to APNS
    logger.info(
      {
        notificationId: job.id,
        type: job.type,
        userId: job.userId,
        title: job.title,
        body: job.body,
        delivery: 'MOCK',
      },
      'NotificationQueue: [MOCK DELIVERY] Notification would be sent to device'
    );

    // TODO: Phase X - Real APNS delivery
    // await apnsService.send(job.userId, {
    //   title: job.title,
    //   body: job.body,
    //   data: job.data,
    // });
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
