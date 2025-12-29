/**
 * Mock Flight Data Service
 * Provides realistic flight data for development without external API calls
 */

import type {
  Flight,
  FlightSearchResult,
  Airport,
} from '../types/flight.types';
import { FlightStatus } from '../types/flight.types';

// ============================================================================
// MOCK AIRPORT DATA
// ============================================================================

const AIRPORTS: Record<string, Airport> = {
  LAX: {
    code: 'LAX',
    name: 'Los Angeles International',
    city: 'Los Angeles',
    country: 'United States',
    latitude: 33.9425,
    longitude: -118.4081,
  },
  JFK: {
    code: 'JFK',
    name: 'John F. Kennedy International',
    city: 'New York',
    country: 'United States',
    latitude: 40.6413,
    longitude: -73.7781,
  },
  SFO: {
    code: 'SFO',
    name: 'San Francisco International',
    city: 'San Francisco',
    country: 'United States',
    latitude: 37.6213,
    longitude: -122.379,
  },
  ORD: {
    code: 'ORD',
    name: "O'Hare International",
    city: 'Chicago',
    country: 'United States',
    latitude: 41.9742,
    longitude: -87.9073,
  },
  DFW: {
    code: 'DFW',
    name: 'Dallas/Fort Worth International',
    city: 'Dallas',
    country: 'United States',
    latitude: 32.8998,
    longitude: -97.0403,
  },
  ATL: {
    code: 'ATL',
    name: 'Hartsfield-Jackson Atlanta International',
    city: 'Atlanta',
    country: 'United States',
    latitude: 33.6407,
    longitude: -84.4277,
  },
  DEN: {
    code: 'DEN',
    name: 'Denver International',
    city: 'Denver',
    country: 'United States',
    latitude: 39.8561,
    longitude: -104.6737,
  },
  SEA: {
    code: 'SEA',
    name: 'Seattle-Tacoma International',
    city: 'Seattle',
    country: 'United States',
    latitude: 47.4502,
    longitude: -122.3088,
  },
  MIA: {
    code: 'MIA',
    name: 'Miami International',
    city: 'Miami',
    country: 'United States',
    latitude: 25.7959,
    longitude: -80.2870,
  },
  EWR: {
    code: 'EWR',
    name: 'Newark Liberty International',
    city: 'Newark',
    country: 'United States',
    latitude: 40.6895,
    longitude: -74.1745,
  },
};

// ============================================================================
// MOCK FLIGHT DATA
// ============================================================================

function generateFlightId(airlineCode: string, flightNumber: string, date: string): string {
  return `${airlineCode}_${flightNumber}_${date}`;
}

function generateMockFlight(
  airlineCode: string,
  flightNumber: string,
  originCode: string,
  destCode: string,
  dateStr: string,
  status: FlightStatus = FlightStatus.SCHEDULED,
  delayMinutes: number = 0,
): Flight {
  const origin = AIRPORTS[originCode];
  const dest = AIRPORTS[destCode];

  if (!origin || !dest) {
    throw new Error(`Airport not found: ${!origin ? originCode : destCode}`);
  }

  // Parse date and create times
  const date = new Date(dateStr);
  const scheduledDeparture = new Date(date);
  scheduledDeparture.setHours(10, 0, 0, 0); // 10:00 AM

  const scheduledArrival = new Date(scheduledDeparture);
  scheduledArrival.setHours(scheduledArrival.getHours() + 5); // 5 hour flight

  // Apply delay
  const estimatedDeparture = delayMinutes > 0
    ? new Date(scheduledDeparture.getTime() + delayMinutes * 60 * 1000)
    : undefined;

  const estimatedArrival = delayMinutes > 0
    ? new Date(scheduledArrival.getTime() + delayMinutes * 60 * 1000)
    : undefined;

  return {
    id: generateFlightId(airlineCode, flightNumber, dateStr),
    airlineCode,
    airlineName: getAirlineName(airlineCode),
    flightNumber,
    route: {
      origin: {
        ...origin,
        terminal: originCode === 'LAX' ? 'T4' : originCode === 'JFK' ? 'T4' : 'T1',
        gate: `${String(Math.floor(Math.random() * 40) + 1).padStart(2, '0')}`,
      },
      destination: {
        ...dest,
        terminal: destCode === 'LAX' ? 'T4' : destCode === 'JFK' ? 'T4' : 'T1',
        gate: `${String(Math.floor(Math.random() * 40) + 1).padStart(2, '0')}`,
      },
    },
    times: {
      scheduledDeparture: scheduledDeparture.toISOString(),
      scheduledArrival: scheduledArrival.toISOString(),
      estimatedDeparture: estimatedDeparture?.toISOString(),
      estimatedArrival: estimatedArrival?.toISOString(),
    },
    status,
    aircraft: {
      type: 'Boeing 737-800',
      registration: `N${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    },
    baggage: {
      claim: `Carousel ${Math.floor(Math.random() * 10) + 1}`,
    },
    delayMinutes: delayMinutes > 0 ? delayMinutes : undefined,
    lastUpdated: new Date().toISOString(),
  };
}

function getAirlineName(code: string): string {
  const airlines: Record<string, string> = {
    AA: 'American Airlines',
    UA: 'United Airlines',
    DL: 'Delta Air Lines',
    WN: 'Southwest Airlines',
    AS: 'Alaska Airlines',
    B6: 'JetBlue Airways',
  };
  return airlines[code] || `${code} Airlines`;
}

// Pre-generated mock flights for testing
const MOCK_FLIGHTS: Flight[] = [
  generateMockFlight('AA', '1234', 'LAX', 'JFK', '2025-01-15', FlightStatus.SCHEDULED, 0),
  generateMockFlight('UA', '567', 'SFO', 'ORD', '2025-01-15', FlightStatus.DELAYED, 45),
  generateMockFlight('DL', '890', 'ATL', 'DFW', '2025-01-15', FlightStatus.BOARDING, 15),
  generateMockFlight('AA', '456', 'JFK', 'LAX', '2025-01-15', FlightStatus.IN_AIR, 0),
  generateMockFlight('UA', '789', 'DEN', 'SEA', '2025-01-15', FlightStatus.SCHEDULED, 0),
  generateMockFlight('DL', '234', 'MIA', 'EWR', '2025-01-15', FlightStatus.DELAYED, 120),
  generateMockFlight('AA', '345', 'LAX', 'SFO', '2025-01-15', FlightStatus.SCHEDULED, 0),
  generateMockFlight('UA', '678', 'ORD', 'ATL', '2025-01-15', FlightStatus.LANDED, 5),
];

// ============================================================================
// MOCK DATA SERVICE
// ============================================================================

export class MockDataService {
  private flights: Map<string, Flight> = new Map();

  constructor() {
    // Initialize with mock data
    MOCK_FLIGHTS.forEach(flight => {
      this.flights.set(flight.id, flight);
    });
  }

  /**
   * Search for flights by flight number
   */
  async searchByFlightNumber(
    airlineCode: string,
    flightNumber: string,
    date: string,
  ): Promise<FlightSearchResult[]> {
    await this.simulateNetworkDelay(50, 200);

    const flightId = generateFlightId(airlineCode, flightNumber, date);
    const flight = this.flights.get(flightId);

    if (flight) {
      return [{
        flight,
        confidence: 1.0,
      }];
    }

    // Generate a new flight on-the-fly for testing
    const mockFlight = generateMockFlight(
      airlineCode,
      flightNumber,
      'LAX',
      'JFK',
      date,
    );
    this.flights.set(mockFlight.id, mockFlight);

    return [{
      flight: mockFlight,
      confidence: 0.9,
    }];
  }

  /**
   * Search for flights by route
   */
  async searchByRoute(
    originCode: string,
    destinationCode: string,
    date: string,
  ): Promise<FlightSearchResult[]> {
    await this.simulateNetworkDelay(100, 300);

    // Generate mock flights for the route
    const results: FlightSearchResult[] = [];
    const airlines = ['AA', 'UA', 'DL', 'WN'];

    for (let i = 0; i < 5; i++) {
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      const flightNumber = String(Math.floor(Math.random() * 9000) + 1000);
      const delayMinutes = Math.random() > 0.7 ? Math.floor(Math.random() * 120) : 0;
      const status = delayMinutes > 0
        ? FlightStatus.DELAYED
        : Math.random() > 0.5
        ? FlightStatus.SCHEDULED
        : FlightStatus.IN_AIR;

      const flight = generateMockFlight(
        airline,
        flightNumber,
        originCode,
        destinationCode,
        date,
        status,
        delayMinutes,
      );

      this.flights.set(flight.id, flight);
      results.push({
        flight,
        confidence: 0.85 + Math.random() * 0.15,
      });
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get a specific flight by ID
   */
  async getFlightById(flightId: string): Promise<Flight | null> {
    await this.simulateNetworkDelay(30, 100);

    const flight = this.flights.get(flightId);

    if (!flight) {
      return null;
    }

    // Simulate real-time updates
    const updatedFlight = {
      ...flight,
      lastUpdated: new Date().toISOString(),
    };

    this.flights.set(flightId, updatedFlight);
    return updatedFlight;
  }

  /**
   * Get all airports
   */
  async getAllAirports(): Promise<Airport[]> {
    await this.simulateNetworkDelay(20, 50);
    return Object.values(AIRPORTS);
  }

  /**
   * Get all flights
   */
  async getAllFlights(): Promise<Flight[]> {
    await this.simulateNetworkDelay(30, 80);
    return Array.from(this.flights.values());
  }

  /**
   * Search airports by code or name
   */
  async searchAirports(query: string): Promise<Airport[]> {
    await this.simulateNetworkDelay(30, 80);

    const q = query.toLowerCase();
    return Object.values(AIRPORTS).filter(airport =>
      airport.code.toLowerCase().includes(q) ||
      airport.city.toLowerCase().includes(q) ||
      airport.name.toLowerCase().includes(q),
    ).slice(0, 10);
  }

  /**
   * Simulate network delay for realistic API behavior
   */
  private simulateNetworkDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Export singleton instance
export const mockDataService = new MockDataService();
