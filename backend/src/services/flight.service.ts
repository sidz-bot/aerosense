/**
 * Flight Service
 * Business logic layer for flight operations
 */

import { mockDataService } from './mock-data.service';
import {
  trackFlight as dbTrackFlight,
  untrackFlight as dbUntrackFlight,
  getUserTrackedFlights,
} from '../utils/database-helpers';
import { logger } from '../utils/logger';
import type {
  Flight,
  FlightSearchQuery,
  FlightSearchResult,
  Connection,
  RiskFactor,
} from '../types/flight.types';
import { ConnectionRiskLevel, FlightStatus } from '../types/flight.types';

export class FlightService {
  /**
   * Search flights based on query type
   */
  async searchFlights(query: FlightSearchQuery): Promise<FlightSearchResult[]> {
    switch (query.type) {
      case 'BY_NUMBER':
        if (!query.airlineCode || !query.flightNumber || !query.date) {
          throw new Error('Airline code, flight number, and date are required for flight number search');
        }
        return mockDataService.searchByFlightNumber(
          query.airlineCode,
          query.flightNumber,
          query.date,
        );

      case 'BY_ROUTE':
        if (!query.originAirportCode || !query.destinationAirportCode || !query.date) {
          throw new Error('Origin, destination, and date are required for route search');
        }
        return mockDataService.searchByRoute(
          query.originAirportCode,
          query.destinationAirportCode,
          query.date,
        );

      default:
        throw new Error(`Unsupported search type: ${query.type}`);
    }
  }

  /**
   * Get flight by ID
   */
  async getFlight(flightId: string): Promise<Flight> {
    const flight = await mockDataService.getFlightById(flightId);

    if (!flight) {
      throw new Error(`Flight not found: ${flightId}`);
    }

    return flight;
  }

  /**
   * Calculate connection risk between two flights
   * Implementation of the algorithm from Architecture.md
   */
  async calculateConnectionRisk(
    incomingFlightId: string,
    outgoingFlightId: string,
  ): Promise<Connection> {
    const [incoming, outgoing] = await Promise.all([
      this.getFlight(incomingFlightId),
      this.getFlight(outgoingFlightId),
    ]);

    // Get scheduled times
    const scheduledArrival = new Date(incoming.times.scheduledArrival);
    const scheduledDeparture = new Date(outgoing.times.scheduledDeparture);

    // Calculate buffer time
    const bufferMinutes = (scheduledDeparture.getTime() - scheduledArrival.getTime()) / (1000 * 60);

    // Get current delay
    const currentDelay = incoming.delayMinutes || 0;

    // Estimate gate change time
    const gateChangeTime = this.estimateGateChangeTime(
      incoming.route.destination.gate || '',
      outgoing.route.origin.gate || '',
      incoming.route.destination.terminal,
      outgoing.route.origin.terminal,
    );

    // Calculate effective buffer
    const effectiveBuffer = bufferMinutes - currentDelay - gateChangeTime;

    // Determine risk level
    let riskLevel: ConnectionRiskLevel;
    if (effectiveBuffer < 20) {
      riskLevel = ConnectionRiskLevel.CRITICAL;
    } else if (effectiveBuffer < 30) {
      riskLevel = ConnectionRiskLevel.HIGH_RISK;
    } else if (effectiveBuffer < 45) {
      riskLevel = ConnectionRiskLevel.AT_RISK;
    } else {
      riskLevel = ConnectionRiskLevel.ON_TRACK;
    }

    // Build risk factors
    const factors: RiskFactor[] = [
      {
        type: 'CONNECTION_TIME',
        description: `${Math.floor(bufferMinutes)} minutes between flights`,
        impact: bufferMinutes >= 45 ? 'POSITIVE' : bufferMinutes >= 30 ? 'NEUTRAL' : 'NEGATIVE',
        weight: 0.3,
      },
      {
        type: 'DELAY',
        description: currentDelay > 0
          ? `Incoming flight delayed ${currentDelay} minutes`
          : 'No current delay',
        impact: currentDelay > 0 ? 'NEGATIVE' : 'POSITIVE',
        weight: 0.4,
      },
      {
        type: 'GATE_DISTANCE',
        description: gateChangeTime > 10
          ? `~${gateChangeTime} minutes between gates`
          : 'Same gate/terminal',
        impact: gateChangeTime > 10 ? 'NEGATIVE' : 'POSITIVE',
        weight: 0.2,
      },
    ];

    // Add historical factor (mocked)
    const historicalOnTimeRate = 0.78 + Math.random() * 0.15; // 78-93% on-time
    factors.push({
      type: 'HISTORICAL',
      description: `Historical on-time rate: ${Math.round(historicalOnTimeRate * 100)}%`,
      impact: historicalOnTimeRate > 0.85 ? 'POSITIVE' : 'NEUTRAL',
      weight: 0.1,
    });

    // Calculate confidence based on data quality
    const confidence = 0.75 + Math.random() * 0.2; // 75-95% confidence

    return {
      id: `conn_${incomingFlightId}_${outgoingFlightId}`,
      incomingFlight: incoming,
      outgoingFlight: outgoing,
      risk: {
        level: riskLevel,
        bufferMinutes: Math.round(effectiveBuffer),
        factors,
        confidence: Math.round(confidence * 100) / 100,
        calculatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Estimate walking time between gates
   * Simplified algorithm based on terminal/gate changes
   */
  private estimateGateChangeTime(
    fromGate: string,
    toGate: string,
    fromTerminal?: string,
    toTerminal?: string,
  ): number {
    // Same gate
    if (fromGate === toGate) {
      return 0;
    }

    // Same terminal
    if (fromTerminal === toTerminal) {
      // Estimate gate-to-gate walking time
      const gateNum1 = parseInt(fromGate.replace(/\D/g, '')) || 0;
      const gateNum2 = parseInt(toGate.replace(/\D/g, '')) || 0;
      return 5 + Math.abs(gateNum1 - gateNum2) * 0.5; // ~5 min base + 0.5 min per gate
    }

    // Different terminals
    // Minimum 10 minutes for terminal change (could be 20-30+ at large airports)
    return 15;
  }

  /**
   * Get tracked flights for a user
   * Returns flights from the database that the user is tracking
   */
  async getTrackedFlights(userId: string): Promise<Flight[]> {
    const userFlights = await getUserTrackedFlights(userId);

    // Map database results to Flight type
    return userFlights.map((uf) => ({
      id: uf.flight.id,
      airlineCode: uf.flight.airlineCode,
      airlineName: uf.flight.airlineName,
      flightNumber: uf.flight.flightNumber,
      route: {
        origin: {
          code: uf.flight.origin.code,
          name: uf.flight.origin.name,
          city: uf.flight.origin.city,
          country: uf.flight.origin.country,
          gate: uf.flight.departureGate || undefined,
          terminal: uf.flight.terminal || undefined,
        },
        destination: {
          code: uf.flight.destination.code,
          name: uf.flight.destination.name,
          city: uf.flight.destination.city,
          country: uf.flight.destination.country,
          gate: uf.flight.arrivalGate || undefined,
          terminal: uf.flight.terminal || undefined,
        },
      },
      times: {
        scheduledDeparture: uf.flight.scheduledDeparture,
        scheduledArrival: uf.flight.scheduledArrival,
        estimatedDeparture: uf.flight.estimatedDeparture || undefined,
        estimatedArrival: uf.flight.estimatedArrival || undefined,
        actualDeparture: uf.flight.actualDeparture || undefined,
        actualArrival: uf.flight.actualArrival || undefined,
      },
      status: this.mapDbStatusToFlightStatus(uf.flight.status),
      delayMinutes: uf.flight.delayMinutes,
      aircraft: uf.flight.aircraftType ? { type: uf.flight.aircraftType } : undefined,
      baggage: uf.flight.baggageClaim ? { claim: uf.flight.baggageClaim } : undefined,
      lastUpdated: uf.flight.updatedAt.toISOString(),
    }));
  }

  /**
   * Map database status enum to FlightStatus enum
   */
  private mapDbStatusToFlightStatus(status: string): FlightStatus {
    const statusMap: Record<string, FlightStatus> = {
      SCHEDULED: FlightStatus.SCHEDULED,
      DELAYED: FlightStatus.DELAYED,
      IN_AIR: FlightStatus.IN_AIR,
      LANDED: FlightStatus.LANDED,
      CANCELED: FlightStatus.CANCELED,
      BOARDING: FlightStatus.BOARDING,
      DEPARTED: FlightStatus.DEPARTED,
      DIVERTED: FlightStatus.IN_AIR, // Map diverted to in_air for display
    };
    return statusMap[status] || FlightStatus.SCHEDULED;
  }

  /**
   * Track a flight for a user
   * Validates flight exists and persists tracking relationship to database
   */
  async trackFlight(userId: string, flightId: string): Promise<Flight> {
    // 1. Validate flight exists
    const flight = await this.getFlight(flightId);

    // 2. Add to user's tracked flights in database
    // Uses upsert pattern to handle duplicate tracking gracefully
    try {
      await dbTrackFlight(userId, flightId);
      logger.info({ userId, flightId }, 'Flight tracked successfully');
    } catch (error: any) {
      // Handle unique constraint violation (already tracking)
      if (error?.code === 'P2002') {
        logger.info({ userId, flightId }, 'Flight already tracked, returning existing');
      } else {
        throw error;
      }
    }

    // Note: Ingestion priority queue update will be implemented in Phase 4
    // Note: Notification subscription will be implemented in Phase 5

    return flight;
  }

  /**
   * Untrack a flight for a user
   * Removes the tracking relationship from the database
   */
  async untrackFlight(userId: string, flightId: string): Promise<void> {
    // 1. Remove from user's tracked flights
    await dbUntrackFlight(userId, flightId);

    logger.info({ userId, flightId }, 'Flight untracked successfully');

    // Note: Ingestion priority update will be implemented in Phase 4
    // Note: Notification unsubscription will be implemented in Phase 5
  }
}

// Export singleton instance
export const flightService = new FlightService();
