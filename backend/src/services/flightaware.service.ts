/**
 * FlightAware API Client
 *
 * Integrates with FlightAware AeroAPI v4 for real-time flight data
 * Implements caching to minimize API costs
 *
 * API Documentation: https://flightaware.com/commercial/aeroapi4/documentation
 */

import { cacheService, CacheKeys } from '../utils/redis';
import { logger } from '../utils/logger';
import { config } from '../config';
import type { Flight } from '../types/flight.types';
import { FlightStatus } from '../types/flight.types';

// =============================================================================
// TYPES
// =============================================================================

interface FlightAwareConfig {
  apiKey: string;
  baseUrl: string;
}

interface FlightAwareFlightResponse {
  flights: Array<{
    flight_id: string;
    ident: string;
    ident_icao: string;
    airline_code: string;
    airline_icao: string;
    flight_number: string;
    origin: {
      code: string;
      airport_name: string;
      city: string;
      latitude: number;
      longitude: number;
    };
    destination: {
      code: string;
      airport_name: string;
      city: string;
      latitude: number;
      longitude: number;
    };
    scheduled_out: string;
    estimated_out: string;
    actual_out: string;
    scheduled_in: string;
    estimated_in: string;
    actual_in: string;
    status: string;
    delay_minutes: number;
    gate_origin: string;
    gate_destination: string;
    terminal_origin: string;
    terminal_destination: string;
    baggage_claim: string;
    aircraft_type: string;
    filed_airspeed_kts: number;
    filed_airspeed_mach: number;
    distance_filed: number;
  }>;
}

// =============================================================================
// FLIGHTAWARE API CLIENT
// =============================================================================

export class FlightAwareService {
  private config: FlightAwareConfig;

  constructor() {
    this.config = {
      apiKey: config.flightAware.apiKey || '',
      baseUrl: config.flightAware.apiBase || 'https://aeroapi.flightaware.com/aeroapi',
    };

    if (!this.config.apiKey) {
      logger.warn('FlightAware API key not configured, using mock data');
    }
  }

  /**
   * Search flights by number and date
   */
  async searchByFlightNumber(
    airlineCode: string,
    flightNumber: string,
    date: string
  ): Promise<Flight[]> {
    const cacheKey = CacheKeys.flightSearch('number', {
      airline: airlineCode,
      flight: flightNumber,
      date,
    });

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.info({ airlineCode, flightNumber, date }, 'FlightAware: search by number');

        if (!this.config.apiKey) {
          return this.getMockFlight(airlineCode, flightNumber, date);
        }

        const response = await this.fetchFromFlightAware(
          `/flights/${airlineCode}${flightNumber}?start=${date}&end=${date}`
        );

        return this.transformFlightAwareResponse(response);
      },
      60 // 60 second TTL
    );
  }

  /**
   * Search flights by route and date
   */
  async searchByRoute(
    originCode: string,
    destinationCode: string,
    date: string
  ): Promise<Flight[]> {
    const cacheKey = CacheKeys.flightSearch('route', {
      origin: originCode,
      destination: destinationCode,
      date,
    });

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.info({ originCode, destinationCode, date }, 'FlightAware: search by route');

        if (!this.config.apiKey) {
          return this.getMockFlightsForRoute(originCode, destinationCode, date);
        }

        const response = await this.fetchFromFlightAware(
          `/flights/${originCode}/${destinationCode}?start=${date}&end=${date}`
        );

        return this.transformFlightAwareResponse(response);
      },
      60
    );
  }

  /**
   * Get flight by ID
   */
  async getFlightById(flightId: string): Promise<Flight | null> {
    const cacheKey = CacheKeys.flight(flightId, new Date().toISOString().split('T')[0]);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.info({ flightId }, 'FlightAware: get flight by ID');

        if (!this.config.apiKey) {
          return this.getMockFlightById(flightId);
        }

        try {
          const response = await this.fetchFromFlightAware(`/flights/${flightId}`);
          const flights = this.transformFlightAwareResponse(response);
          return flights[0] || null;
        } catch (error) {
          logger.error({ error, flightId }, 'FlightAware API error');
          return null;
        }
      },
      30 // 30 second TTL for individual flights
    );
  }

  /**
   * Fetch from FlightAware API
   */
  private async fetchFromFlightAware(endpoint: string): Promise<FlightAwareFlightResponse> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'x-apikey': this.config.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('FlightAware API rate limit exceeded');
      }
      if (response.status === 401) {
        throw new Error('FlightAware API key invalid');
      }
      throw new Error(`FlightAware API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Transform FlightAware response to internal Flight format
   */
  private transformFlightAwareResponse(response: FlightAwareFlightResponse): Flight[] {
    return response.flights.map((f) => ({
      id: f.flight_id,
      airlineCode: f.airline_code,
      airlineName: f.airline_icao || f.airline_code,
      flightNumber: f.flight_number,
      route: {
        origin: {
          code: f.origin.code,
          name: f.origin.airport_name,
          city: f.origin.city,
          country: '', // Not provided by FlightAware
          terminal: f.terminal_origin || undefined,
          gate: f.gate_origin || undefined,
          latitude: f.origin.latitude,
          longitude: f.origin.longitude,
        },
        destination: {
          code: f.destination.code,
          name: f.destination.airport_name,
          city: f.destination.city,
          country: '', // Not provided by FlightAware
          terminal: f.terminal_destination || undefined,
          gate: f.gate_destination || undefined,
          latitude: f.destination.latitude,
          longitude: f.destination.longitude,
        },
      },
      times: {
        scheduledDeparture: f.scheduled_out,
        scheduledArrival: f.scheduled_in,
        estimatedDeparture: f.estimated_out || undefined,
        estimatedArrival: f.estimated_in || undefined,
        actualDeparture: f.actual_out || undefined,
        actualArrival: f.actual_in || undefined,
      },
      status: this.mapFlightAwareStatus(f.status),
      delayMinutes: f.delay_minutes || undefined,
      aircraft: f.aircraft_type
        ? { type: f.aircraft_type }
        : undefined,
      baggage: f.baggage_claim
        ? { claim: f.baggage_claim }
        : undefined,
      lastUpdated: new Date().toISOString(),
    }));
  }

  /**
   * Map FlightAware status to internal FlightStatus
   */
  private mapFlightAwareStatus(status: string): FlightStatus {
    const statusMap: Record<string, FlightStatus> = {
      'Scheduled': FlightStatus.SCHEDULED,
      'En Route': FlightStatus.IN_AIR,
      'In Flight': FlightStatus.IN_AIR,
      'Arrived': FlightStatus.LANDED,
      'Canceled': FlightStatus.CANCELED,
      'Diverted': FlightStatus.DELAYED, // Map to DELAYED since DIVERTED doesn't exist
      'Boarding': FlightStatus.BOARDING,
      'Departed': FlightStatus.DEPARTED,
      'Delayed': FlightStatus.DELAYED,
    };

    return statusMap[status] || FlightStatus.SCHEDULED;
  }

  /**
   * Mock data for when API key is not configured
   */
  private getMockFlight(airlineCode: string, flightNumber: string, date: string): Flight[] {
    return [this.getMockFlightById(`${airlineCode}_${flightNumber}_${date}`)];
  }

  private getMockFlightById(flightId: string): Flight {
    const [airlineCode, flightNumber] = flightId.split('_');

    return {
      id: flightId,
      airlineCode: airlineCode || 'AA',
      airlineName: 'American Airlines',
      flightNumber: flightNumber || '1234',
      route: {
        origin: {
          code: 'LAX',
          name: 'Los Angeles International',
          city: 'Los Angeles',
          country: 'United States',
          terminal: 'T4',
          gate: 'A12',
          latitude: 33.9425,
          longitude: -118.4081,
        },
        destination: {
          code: 'JFK',
          name: 'John F. Kennedy International',
          city: 'New York',
          country: 'United States',
          terminal: 'T4',
          gate: 'B24',
          latitude: 40.6413,
          longitude: -73.7781,
        },
      },
      times: {
        scheduledDeparture: '2025-01-15T10:00:00Z',
        scheduledArrival: '2025-01-15T18:00:00Z',
        estimatedDeparture: '2025-01-15T10:15:00Z',
        estimatedArrival: '2025-01-15T18:15:00Z',
      },
      status: FlightStatus.SCHEDULED,
      delayMinutes: 15,
      aircraft: { type: 'Boeing 737-800' },
      baggage: { claim: 'Carousel 5' },
      lastUpdated: new Date().toISOString(),
    };
  }

  private getMockFlightsForRoute(origin: string, destination: string, date: string): Flight[] {
    const airlines = ['AA', 'UA', 'DL', 'WN'];
    const flights: Flight[] = [];

    for (let i = 0; i < 5; i++) {
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      const flightNum = String(Math.floor(Math.random() * 9000) + 1000);

      flights.push({
        id: `${airline}_${flightNum}_${date}_${i}`,
        airlineCode: airline,
        airlineName: `${airline} Airlines`,
        flightNumber: flightNum,
        route: {
          origin: {
            code: origin,
            name: `${origin} Airport`,
            city: 'City',
            country: 'United States',
            terminal: 'T1',
            gate: `${i + 1}A`,
            latitude: 0,
            longitude: 0,
          },
          destination: {
            code: destination,
            name: `${destination} Airport`,
            city: 'City',
            country: 'United States',
            terminal: 'T2',
            gate: `${i + 1}B`,
            latitude: 0,
            longitude: 0,
          },
        },
        times: {
          scheduledDeparture: `${date}T${10 + i}:00:00Z`,
          scheduledArrival: `${date}T${15 + i}:00:00Z`,
        },
        status: FlightStatus.SCHEDULED,
        lastUpdated: new Date().toISOString(),
      });
    }

    return flights;
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const flightAwareService = new FlightAwareService();
