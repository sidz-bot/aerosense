/**
 * Flight Service
 * Business logic layer for flight operations
 */

import { mockDataService } from './mock-data.service';
import type {
  Flight,
  FlightSearchQuery,
  FlightSearchResult,
  Connection,
  RiskFactor,
} from '../types/flight.types';
import { ConnectionRiskLevel } from '../types/flight.types';

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
   * Get tracked flights for a user (mock implementation)
   */
  async getTrackedFlights(_userId: string): Promise<Flight[]> {
    // In real implementation, this would query the database
    // For now, return a subset of mock flights
    const allFlights = await mockDataService.getAllFlights();
    return allFlights.slice(0, 3);
  }

  /**
   * Track a flight for a user (mock implementation)
   */
  async trackFlight(_userId: string, flightId: string): Promise<Flight> {
    // In real implementation, this would:
    // 1. Validate flight exists
    // 2. Add to user's tracked flights in database
    // 3. Update ingestion priority queue
    // 4. Subscribe to notifications

    const flight = await this.getFlight(flightId);

    // TODO: Implement actual tracking logic
    return flight;
  }

  /**
   * Untrack a flight for a user
   */
  async untrackFlight(_userId: string, _flightId: string): Promise<void> {
    // In real implementation, this would:
    // 1. Remove from user's tracked flights
    // 2. Update ingestion priority
    // 3. Unsubscribe from notifications

    // TODO: Implement actual untracking logic
  }
}

// Export singleton instance
export const flightService = new FlightService();
