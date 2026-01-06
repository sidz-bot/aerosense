/**
 * Flight Polling Scheduler Service
 *
 * Periodically polls FlightAware API for updates on tracked flights
 * Detects changes, persists to database, and triggers notifications
 *
 * PHASE 4 - Data Ingestion & Change Detection
 */

import { flightAwareService } from './flightaware.service';
import { flightService } from './flight.service';
import { airportService } from './airport.service';
import { notificationQueueService } from './notification-queue.service';
import { upsertFlight, logFlightChange } from '../utils/database-helpers';
import { logger } from '../utils/logger';
import { config } from '../config';
import { ConnectionRiskLevel, NotificationType } from '@prisma/client';
import { db } from '../utils/database';

// =============================================================================
// TYPES
// =============================================================================

interface FlightChange {
  type: string; // Use string instead of ChangeType for flexibility
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  description: string;
}

interface PollResult {
  totalFlights: number;
  updatedFlights: number;
  changesDetected: number;
  errors: number;
}

// =============================================================================
// FLIGHT POLLER SERVICE
// =============================================================================

export class FlightPollerService {
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private pollIntervalMs: number;

  constructor() {
    // Default: poll every 60 seconds (configurable via env)
    this.pollIntervalMs = (config.flightData.pollingIntervalSeconds || 60) * 1000;
    logger.info({ intervalMs: this.pollIntervalMs }, 'FlightPoller: initialized');
  }

  /**
   * Start the polling scheduler
   */
  start(): void {
    if (this.isPolling) {
      logger.warn('FlightPoller: already polling, ignoring start request');
      return;
    }

    this.isPolling = true;
    logger.info('FlightPoller: starting polling scheduler');

    // Initial poll
    this.poll().catch((error) => {
      logger.error({ error }, 'FlightPoller: initial poll failed');
    });

    // Schedule recurring polls
    this.pollInterval = setInterval(() => {
      this.poll().catch((error) => {
        logger.error({ error }, 'FlightPoller: scheduled poll failed');
      });
    }, this.pollIntervalMs);
  }

  /**
   * Stop the polling scheduler
   */
  stop(): void {
    if (!this.isPolling) {
      logger.warn('FlightPoller: not polling, ignoring stop request');
      return;
    }

    this.isPolling = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    logger.info('FlightPoller: stopped polling scheduler');
  }

  /**
   * Main polling logic
   */
  private async poll(): Promise<PollResult> {
    const startTime = Date.now();
    const result: PollResult = {
      totalFlights: 0,
      updatedFlights: 0,
      changesDetected: 0,
      errors: 0,
    };

    try {
      // Get all users with tracked flights
      // For MVP: fetch all tracked flights (optimization: batch by users)
      const trackedFlights = await this.getAllTrackedFlights();
      result.totalFlights = trackedFlights.length;

      logger.info(
        { flightCount: trackedFlights.length },
        'FlightPoller: polling for flight updates'
      );

      // Process each tracked flight
      for (const trackedFlight of trackedFlights) {
        try {
          const flightId = trackedFlight.flight.id;
          const userId = trackedFlight.user.id;

          // Fetch latest data from FlightAware
          const latestFlight = await flightAwareService.getFlightById(flightId);

          if (!latestFlight) {
            logger.warn({ flightId }, 'FlightPoller: flight not found in FlightAware');
            continue;
          }

          // Detect changes
          const changes = this.detectChanges(trackedFlight.flight, latestFlight);

          if (changes.length > 0) {
            result.updatedFlights++;
            result.changesDetected += changes.length;

            // Persist updated flight data
            await this.persistFlightUpdate(latestFlight);

            // Log all changes
            for (const change of changes) {
              await logFlightChange({
                flightId,
                type: change.type as any, // Cast to ChangeType for database
                oldValue: change.oldValue,
                newValue: change.newValue,
                source: 'FlightAware',
              });

              logger.info(
                {
                  flightId,
                  userId,
                  changeType: change.type,
                  description: change.description,
                },
                'FlightPoller: change detected'
              );

              // Enqueue notification based on change type
              await this.enqueueNotificationForChange(userId, flightId, change, latestFlight);
            }

            // Recalculate connection risk for affected connections
            await this.recalculateConnectionRisk(flightId);
          }
        } catch (error) {
          result.errors++;
          logger.error(
            { error, flightId: trackedFlight.flight.id },
            'FlightPoller: error processing flight'
          );
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        {
          ...result,
          durationMs: duration,
        },
        'FlightPoller: poll completed'
      );
    } catch (error) {
      logger.error({ error }, 'FlightPoller: poll failed');
    }

    return result;
  }

  /**
   * Get all tracked flights from database
   */
  private async getAllTrackedFlights(): Promise<Array<{ user: { id: string }; flight: any }>> {
    const userFlights = await db.userFlight.findMany({
      where: {
        notificationEnabled: true, // Only poll flights with notifications enabled
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
        flight: {
          include: {
            origin: true,
            destination: true,
          },
        },
      },
    });

    return userFlights.map((uf) => ({
      user: { id: uf.userId },
      flight: uf.flight,
    }));
  }

  /**
   * Detect changes between old and new flight data
   */
  private detectChanges(oldFlight: any, newFlight: any): FlightChange[] {
    const changes: FlightChange[] = [];

    // 1. Check for gate changes
    if (oldFlight.departureGate !== newFlight.route?.origin?.gate) {
      changes.push({
        type: 'GATE_CHANGE',
        oldValue: { gate: oldFlight.departureGate },
        newValue: { gate: newFlight.route?.origin?.gate },
        description: `Departure gate changed from ${oldFlight.departureGate || 'none'} to ${newFlight.route?.origin?.gate || 'none'}`,
      });
    }

    if (oldFlight.arrivalGate !== newFlight.route?.destination?.gate) {
      changes.push({
        type: 'GATE_CHANGE',
        oldValue: { gate: oldFlight.arrivalGate },
        newValue: { gate: newFlight.route?.destination?.gate },
        description: `Arrival gate changed from ${oldFlight.arrivalGate || 'none'} to ${newFlight.route?.destination?.gate || 'none'}`,
      });
    }

    // 2. Check for time changes (schedule updates)
    const oldScheduledDep = oldFlight.scheduledDeparture;
    const newScheduledDep = newFlight.times?.scheduledDeparture;
    if (oldScheduledDep !== newScheduledDep && newScheduledDep) {
      changes.push({
        type: 'TIME_CHANGE',
        oldValue: { scheduledDeparture: oldScheduledDep },
        newValue: { scheduledDeparture: newScheduledDep },
        description: `Scheduled departure time changed`,
      });
    }

    const oldScheduledArr = oldFlight.scheduledArrival;
    const newScheduledArr = newFlight.times?.scheduledArrival;
    if (oldScheduledArr !== newScheduledArr && newScheduledArr) {
      changes.push({
        type: 'TIME_CHANGE',
        oldValue: { scheduledArrival: oldScheduledArr },
        newValue: { scheduledArrival: newScheduledArr },
        description: `Scheduled arrival time changed`,
      });
    }

    // 3. Check for status changes
    if (oldFlight.status !== newFlight.status) {
      changes.push({
        type: 'STATUS_CHANGE',
        oldValue: { status: oldFlight.status },
        newValue: { status: newFlight.status },
        description: `Flight status changed from ${oldFlight.status} to ${newFlight.status}`,
      });
    }

    // 4. Check for delay updates (significant change in delay minutes)
    const oldDelay = oldFlight.delayMinutes || 0;
    const newDelay = newFlight.delayMinutes || 0;
    if (Math.abs(oldDelay - newDelay) >= 5) {
      // Only log if delay changed by 5+ minutes
      changes.push({
        type: 'DELAY_UPDATE',
        oldValue: { delayMinutes: oldDelay },
        newValue: { delayMinutes: newDelay },
        description: `Delay changed from ${oldDelay} to ${newDelay} minutes`,
      });
    }

    // 5. Check for cancellation
    if (newFlight.status === 'CANCELED' && oldFlight.status !== 'CANCELED') {
      changes.push({
        type: 'CANCELLATION',
        oldValue: { status: oldFlight.status },
        newValue: { status: 'CANCELED' },
        description: 'Flight has been canceled',
      });
    }

    return changes;
  }

  /**
   * Persist updated flight data to database
   */
  private async persistFlightUpdate(flight: any): Promise<void> {
    // Ensure airports exist in database and get their IDs
    const originId = await airportService.getOrCreateAirport(
      flight.route.origin.code,
      {
        name: flight.route.origin.name,
        city: flight.route.origin.city,
        country: flight.route.origin.country,
        latitude: flight.route.origin.latitude,
        longitude: flight.route.origin.longitude,
      }
    );

    const destinationId = await airportService.getOrCreateAirport(
      flight.route.destination.code,
      {
        name: flight.route.destination.name,
        city: flight.route.destination.city,
        country: flight.route.destination.country,
        latitude: flight.route.destination.latitude,
        longitude: flight.route.destination.longitude,
      }
    );

    // Transform Flight type to database Flight model
    await upsertFlight({
      airlineCode: flight.airlineCode,
      airlineName: flight.airlineName,
      flightNumber: flight.flightNumber,
      originId,
      destinationId,
      scheduledDeparture: flight.times.scheduledDeparture,
      scheduledArrival: flight.times.scheduledArrival,
      estimatedDeparture: flight.times.estimatedDeparture,
      estimatedArrival: flight.times.estimatedArrival,
      actualDeparture: flight.times.actualDeparture,
      actualArrival: flight.times.actualArrival,
      departureGate: flight.route.origin.gate,
      arrivalGate: flight.route.destination.gate,
      terminal: flight.route.origin.terminal,
      baggageClaim: flight.baggage?.claim,
      status: flight.status,
      delayMinutes: flight.delayMinutes || 0,
      aircraftType: flight.aircraft?.type,
      flightDistance: null, // Not provided by FlightAware in current implementation
      lastFetchedAt: new Date(),
    });
  }

  /**
   * Recalculate connection risk for all connections involving this flight
   */
  private async recalculateConnectionRisk(flightId: string): Promise<void> {
    try {
      // Find all connections where this flight is either incoming or outgoing
      const connections = await db.connection.findMany({
        where: {
          OR: [
            { incomingFlightId: flightId },
            { outgoingFlightId: flightId },
          ],
        },
      });

      if (connections.length === 0) {
        return; // No connections to update
      }

      logger.info(
        { flightId, connectionCount: connections.length },
        'FlightPoller: recalculating connection risk'
      );

      for (const connection of connections) {
        try {
          // Use flight service to calculate new risk
          const riskResult = await flightService.calculateConnectionRisk(
            connection.incomingFlightId,
            connection.outgoingFlightId
          );

          // Update connection in database
          await db.connection.update({
            where: { id: connection.id },
            data: {
              bufferMinutes: riskResult.risk.bufferMinutes,
              effectiveBuffer: riskResult.risk.bufferMinutes, // Simplified for MVP
              riskLevel: this.mapRiskLevel(riskResult.risk.level),
              riskFactors: riskResult.risk.factors as any, // Cast to JsonValue
              confidence: riskResult.risk.confidence,
              incomingGate: riskResult.incomingFlight.route.destination.gate || null,
              outgoingGate: riskResult.outgoingFlight.route.origin.gate || null,
              terminalChange:
                riskResult.incomingFlight.route.destination.terminal !==
                riskResult.outgoingFlight.route.origin.terminal,
              updatedAt: new Date(),
            },
          });

          logger.info(
            { connectionId: connection.id, riskLevel: riskResult.risk.level },
            'FlightPoller: connection risk updated'
          );
        } catch (error) {
          logger.error(
            { error, connectionId: connection.id },
            'FlightPoller: failed to recalculate connection risk'
          );
        }
      }
    } catch (error) {
      logger.error({ error, flightId }, 'FlightPoller: failed to find connections');
    }
  }

  /**
   * Map ConnectionRiskLevel from enum to database enum
   */
  private mapRiskLevel(level: string): ConnectionRiskLevel {
    const levelMap: Record<string, ConnectionRiskLevel> = {
      ON_TRACK: ConnectionRiskLevel.ON_TRACK,
      AT_RISK: ConnectionRiskLevel.AT_RISK,
      HIGH_RISK: ConnectionRiskLevel.HIGH_RISK,
      CRITICAL: ConnectionRiskLevel.CRITICAL,
    };
    return levelMap[level] || ConnectionRiskLevel.ON_TRACK;
  }

  /**
   * Enqueue notification based on change type
   */
  private async enqueueNotificationForChange(
    userId: string,
    flightId: string,
    change: FlightChange,
    flight: any
  ): Promise<void> {
    // Check user's notification preferences for this flight
    const userFlight = await db.userFlight.findFirst({
      where: {
        userId,
        flightId,
      },
      select: {
        gateChangeAlerts: true,
        delayAlerts: true,
        connectionRiskAlerts: true,
        boardingAlerts: true,
      },
    });

    if (!userFlight) {
      return; // User no longer tracking this flight
    }

    let notificationType: NotificationType | null = null;
    let title = '';
    let body = '';
    let priority: 'low' | 'normal' | 'high' = 'normal';
    let data: Record<string, unknown> = {};

    switch (change.type) {
      case 'GATE_CHANGE':
        if (!userFlight.gateChangeAlerts) return;
        notificationType = NotificationType.GATE_CHANGE;
        const isArrivalGate = change.newValue.gate && change.oldValue.gate === (flight.route?.origin?.gate || '');
        title = isArrivalGate ? 'Arrival Gate Changed' : 'Departure Gate Changed';
        body = `Your flight ${flight.airlineCode}${flight.flightNumber} gate has changed from ${change.oldValue.gate || 'TBD'} to ${change.newValue.gate || 'TBD'}.`;
        priority = 'normal';
        data = {
          oldGate: change.oldValue.gate,
          newGate: change.newValue.gate,
          airlineCode: flight.airlineCode,
          flightNumber: flight.flightNumber,
        };
        break;

      case 'DELAY':
        if (!userFlight.delayAlerts) return;
        notificationType = NotificationType.DELAY;
        const delayMinutes = (change.newValue.delayMinutes as number) || 0;
        title = 'Flight Delayed';
        body = `Your flight ${flight.airlineCode}${flight.flightNumber} is delayed ${delayMinutes} minutes.`;
        priority = delayMinutes > 30 ? 'high' : 'normal';
        data = {
          delayMinutes,
          airlineCode: flight.airlineCode,
          flightNumber: flight.flightNumber,
        };
        break;

      case 'CANCELLATION':
        notificationType = NotificationType.FLIGHT_CANCELED;
        title = 'Flight Canceled';
        body = `Your flight ${flight.airlineCode}${flight.flightNumber} has been canceled.`;
        priority = 'high';
        data = {
          airlineCode: flight.airlineCode,
          flightNumber: flight.flightNumber,
        };
        break;

      case 'STATUS_CHANGE':
        // Only notify for specific status changes
        const newStatus = change.newValue.status as string;
        if (newStatus === 'BOARDING' && userFlight.boardingAlerts) {
          notificationType = NotificationType.BOARDING_SOON;
          title = 'Boarding Started';
          body = `Your flight ${flight.airlineCode}${flight.flightNumber} is now boarding.`;
          priority = 'high';
          data = {
            gate: flight.route?.origin?.gate,
            airlineCode: flight.airlineCode,
            flightNumber: flight.flightNumber,
          };
        }
        break;

      case 'TIME_CHANGE':
        // Schedule changes - notify as delay if appropriate
        if (userFlight.delayAlerts) {
          notificationType = NotificationType.DELAY;
          title = 'Schedule Change';
          body = `Your flight ${flight.airlineCode}${flight.flightNumber} schedule has been updated.`;
          priority = 'normal';
          data = {
            airlineCode: flight.airlineCode,
            flightNumber: flight.flightNumber,
          };
        }
        break;

      case 'DELAY_UPDATE':
        if (!userFlight.delayAlerts) return;
        notificationType = NotificationType.DELAY;
        const newDelay = (change.newValue.delayMinutes as number) || 0;
        title = 'Delay Updated';
        body = `Your flight ${flight.airlineCode}${flight.flightNumber} delay is now ${newDelay} minutes.`;
        priority = newDelay > 30 ? 'high' : 'normal';
        data = {
          delayMinutes: newDelay,
          airlineCode: flight.airlineCode,
          flightNumber: flight.flightNumber,
        };
        break;
    }

    if (notificationType) {
      notificationQueueService.enqueue({
        userId,
        flightId,
        type: notificationType,
        title,
        body,
        data,
        priority,
      });

      logger.info(
        {
          userId,
          flightId,
          notificationType,
          title,
        },
        'FlightPoller: notification enqueued'
      );
    }
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const flightPollerService = new FlightPollerService();
