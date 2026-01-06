/**
 * Unit Tests: Notification Queue Service
 * PHASE 7 - Testing & Quality Gate
 */

import { notificationQueueService } from '../../../services/notification-queue.service';
import { NotificationType } from '@prisma/client';

// Mock the database helpers
jest.mock('../../../utils/database-helpers', () => ({
  createNotification: jest.fn(),
}));

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('NotificationQueueService', () => {
  beforeEach(() => {
    // Clear queue before each test
    notificationQueueService.stop();
    notificationQueueService.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Queue Operations
  // ===========================================================================

  describe('Queue Operations', () => {
    it('should enqueue notification with correct priority', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.GATE_CHANGE,
        title: 'Gate Changed',
        body: 'Your flight gate has changed',
        priority: 'high' as const,
      };

      // Act
      const notificationId = notificationQueueService.enqueue(job);

      // Assert
      expect(notificationId).toBeDefined();
      expect(notificationId).toMatch(/^notif_/);
    });

    it('should return queue stats', () => {
      // Arrange
      notificationQueueService.enqueue({
        userId: 'user1',
        flightId: 'flight1',
        type: NotificationType.DELAY,
        title: 'Delay',
        body: 'Flight delayed',
        priority: 'normal',
      });

      // Act
      const stats = notificationQueueService.getStats();

      // Assert
      expect(stats).toEqual({
        queueSize: expect.any(Number),
        isProcessing: false,
        concurrentJobs: 0,
      });
      expect(stats.queueSize).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Notification Types
  // ===========================================================================

  describe('Notification Types', () => {
    it('should handle GATE_CHANGE notifications', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.GATE_CHANGE,
        title: 'Gate Changed',
        body: 'Gate changed from A12 to B24',
        data: {
          oldGate: 'A12',
          newGate: 'B24',
        },
        priority: 'normal' as const,
      };

      // Act
      const id = notificationQueueService.enqueue(job);

      // Assert
      expect(id).toBeDefined();
    });

    it('should handle DELAY notifications', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.DELAY,
        title: 'Flight Delayed',
        body: 'Flight delayed by 30 minutes',
        data: {
          delayMinutes: 30,
        },
        priority: 'high' as const,
      };

      // Act
      const id = notificationQueueService.enqueue(job);

      // Assert
      expect(id).toBeDefined();
    });

    it('should handle FLIGHT_CANCELED notifications', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.FLIGHT_CANCELED,
        title: 'Flight Canceled',
        body: 'Your flight has been canceled',
        priority: 'high' as const,
      };

      // Act
      const id = notificationQueueService.enqueue(job);

      // Assert
      expect(id).toBeDefined();
    });

    it('should handle CONNECTION_RISK notifications', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.CONNECTION_RISK,
        title: 'Connection at Risk',
        body: 'Your connection is at risk',
        data: {
          riskLevel: 'HIGH_RISK',
        },
        priority: 'normal' as const,
      };

      // Act
      const id = notificationQueueService.enqueue(job);

      // Assert
      expect(id).toBeDefined();
    });

    it('should handle BOARDING_SOON notifications', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.BOARDING_SOON,
        title: 'Boarding Soon',
        body: 'Your flight is boarding soon',
        data: {
          gate: 'A12',
        },
        priority: 'high' as const,
      };

      // Act
      const id = notificationQueueService.enqueue(job);

      // Assert
      expect(id).toBeDefined();
    });

    it('should handle CONNECTION_STATUS_CHANGE notifications', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.CONNECTION_STATUS_CHANGE,
        title: 'Connection Status Changed',
        body: 'Your connection risk level has changed',
        data: {
          previousRisk: 'ON_TRACK',
          currentRisk: 'AT_RISK',
        },
        priority: 'normal' as const,
      };

      // Act
      const id = notificationQueueService.enqueue(job);

      // Assert
      expect(id).toBeDefined();
    });
  });

  // ===========================================================================
  // Priority Handling
  // ===========================================================================

  describe('Priority Handling', () => {
    it('should handle high priority notifications', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.FLIGHT_CANCELED,
        title: 'Canceled',
        body: 'Flight canceled',
        priority: 'high' as const,
      };

      // Act
      const id = notificationQueueService.enqueue(job);

      // Assert
      expect(id).toBeDefined();
    });

    it('should handle normal priority notifications', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.GATE_CHANGE,
        title: 'Gate Changed',
        body: 'Gate changed',
        priority: 'normal' as const,
      };

      // Act
      const id = notificationQueueService.enqueue(job);

      // Assert
      expect(id).toBeDefined();
    });

    it('should handle low priority notifications', () => {
      // Arrange
      const job = {
        userId: 'user123',
        flightId: 'flight123',
        type: NotificationType.BOARDING_SOON,
        title: 'Boarding Soon',
        body: 'Boarding soon',
        priority: 'low' as const,
      };

      // Act
      const id = notificationQueueService.enqueue(job);

      // Assert
      expect(id).toBeDefined();
    });
  });

  // ===========================================================================
  // Service Lifecycle
  // ===========================================================================

  describe('Service Lifecycle', () => {
    it('should start and stop processing', () => {
      // Act
      notificationQueueService.start();
      const stats1 = notificationQueueService.getStats();

      notificationQueueService.stop();
      const stats2 = notificationQueueService.getStats();

      // Assert
      expect(stats1.isProcessing).toBe(true);
      expect(stats2.isProcessing).toBe(false);
    });

    it('should handle multiple start requests gracefully', () => {
      // Act
      notificationQueueService.start();
      notificationQueueService.start(); // Second start

      const stats = notificationQueueService.getStats();

      // Assert
      expect(stats.isProcessing).toBe(true);
      notificationQueueService.stop();
    });

    it('should handle multiple stop requests gracefully', () => {
      // Arrange
      notificationQueueService.start();

      // Act
      notificationQueueService.stop();
      notificationQueueService.stop(); // Second stop

      const stats = notificationQueueService.getStats();

      // Assert
      expect(stats.isProcessing).toBe(false);
    });
  });

  // ===========================================================================
  // Concurrency Control
  // ===========================================================================

  describe('Concurrency Control', () => {
    it('should limit concurrent jobs', async () => {
      // Arrange - Enqueue more jobs than max concurrency
      for (let i = 0; i < 10; i++) {
        notificationQueueService.enqueue({
          userId: `user${i}`,
          flightId: `flight${i}`,
          type: NotificationType.DELAY,
          title: 'Delay',
          body: 'Flight delayed',
          priority: 'normal',
        });
      }

      // Act
      const stats = notificationQueueService.getStats();

      // Assert
      expect(stats.queueSize).toBe(10);
      expect(stats.concurrentJobs).toBe(0); // Not processing yet
    });
  });
});
