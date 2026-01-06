/**
 * Unit Tests: Flight Service - Connection Risk Algorithm
 * PHASE 7 - Testing & Quality Gate
 */

import { FlightService } from '../../../services/flight.service';
import { ConnectionRiskLevel, FlightStatus } from '../../../types/flight.types';
import type { Flight } from '../../../types/flight.types';

// Mock the FlightAware service
jest.mock('../../../services/flightaware.service', () => ({
  flightAwareService: {
    searchByFlightNumber: jest.fn(),
    searchByRoute: jest.fn(),
    getFlightById: jest.fn(),
  },
}));

// Import the mocked service after the mock
import { flightAwareService } from '../../../services/flightaware.service';

describe('FlightService - Connection Risk Algorithm', () => {
  let flightService: FlightService;

  beforeEach(() => {
    flightService = new FlightService();
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Test Data Helpers
  // ===========================================================================

  function createMockFlight(overrides?: Partial<Flight>): Flight {
    return {
      id: 'FL1234',
      airlineCode: 'AA',
      airlineName: 'American Airlines',
      flightNumber: '1234',
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
        estimatedDeparture: '2025-01-15T10:00:00Z',
        estimatedArrival: '2025-01-15T18:00:00Z',
      },
      status: FlightStatus.SCHEDULED,
      delayMinutes: 0,
      lastUpdated: new Date().toISOString(),
      ...overrides,
    };
  }

  // ===========================================================================
  // CRITICAL Risk Tests (buffer < 20 minutes)
  // ===========================================================================

  describe('CRITICAL Risk Detection', () => {
    it('should return CRITICAL risk when buffer < 20 minutes with delays', async () => {
      // Arrange
      const incoming = createMockFlight({
        id: 'AA123-in',
        times: {
          ...createMockFlight().times,
          scheduledArrival: '2025-01-15T14:00:00Z',
          estimatedArrival: '2025-01-15T14:30:00Z', // 30 min delay
        },
        delayMinutes: 30,
        status: FlightStatus.DELAYED,
      });

      const outgoing = createMockFlight({
        id: 'AA456-out',
        times: {
          ...createMockFlight().times,
          scheduledDeparture: '2025-01-15T14:50:00Z', // Only 20 min buffer
          estimatedDeparture: '2025-01-15T14:50:00Z',
        },
      });

      // Mock the FlightAware service
      (flightAwareService.getFlightById as jest.Mock)
        .mockResolvedValueOnce(incoming)
        .mockResolvedValueOnce(outgoing);

      // Act
      const result = await flightService.calculateConnectionRisk(incoming.id, outgoing.id);

      // Assert
      expect(result.risk.level).toBe(ConnectionRiskLevel.CRITICAL);
      expect(result.risk.bufferMinutes).toBeLessThan(20);
      expect(result.risk.factors.length).toBeGreaterThan(0);
    });

    it('should return CRITICAL when incoming flight is CANCELED', async () => {
      // Arrange
      const incoming = createMockFlight({
        id: 'AA123-in',
        status: FlightStatus.CANCELED,
        times: {
          ...createMockFlight().times,
          scheduledArrival: '2025-01-15T14:00:00Z',
        },
      });

      const outgoing = createMockFlight({
        id: 'AA456-out',
        times: {
          ...createMockFlight().times,
          scheduledDeparture: '2025-01-15T15:30:00Z',
        },
      });

      (flightAwareService.getFlightById as jest.Mock)
        .mockResolvedValueOnce(incoming)
        .mockResolvedValueOnce(outgoing);

      // Act
      const result = await flightService.calculateConnectionRisk(incoming.id, outgoing.id);

      // Assert
      expect(result.risk.level).toBe(ConnectionRiskLevel.CRITICAL);
    });
  });

  // ===========================================================================
  // HIGH_RISK Tests (buffer 20-45 minutes with delays)
  // ===========================================================================

  describe('HIGH_RISK Detection', () => {
    it('should return HIGH_RISK when buffer is 20-45 minutes with delays', async () => {
      // Arrange
      // buffer = 55 min, delay = 15, gateChange = 15 -> effectiveBuffer = 25 (HIGH_RISK)
      const incoming = createMockFlight({
        id: 'AA123-in',
        times: {
          ...createMockFlight().times,
          scheduledArrival: '2025-01-15T14:00:00Z',
          estimatedArrival: '2025-01-15T14:15:00Z', // 15 min delay
        },
        delayMinutes: 15,
      });

      const outgoing = createMockFlight({
        id: 'AA456-out',
        times: {
          ...createMockFlight().times,
          scheduledDeparture: '2025-01-15T14:55:00Z', // 55 min buffer
        },
        route: {
          ...createMockFlight().route,
          origin: {
            ...createMockFlight().route.origin,
            terminal: 'T7', // Different terminal = 15 min gate change
          },
        },
      });

      (flightAwareService.getFlightById as jest.Mock)
        .mockResolvedValueOnce(incoming)
        .mockResolvedValueOnce(outgoing);

      // Act
      const result = await flightService.calculateConnectionRisk(incoming.id, outgoing.id);

      // Assert
      // effectiveBuffer = 55 - 15 - 15 = 25 -> HIGH_RISK
      expect(result.risk.level).toBe(ConnectionRiskLevel.HIGH_RISK);
    });
  });

  // ===========================================================================
  // AT_RISK Tests (marginal buffer)
  // ===========================================================================

  describe('AT_RISK Detection', () => {
    it('should return AT_RISK when buffer is 45-60 minutes with minor delays', async () => {
      // Arrange
      const incoming = createMockFlight({
        id: 'AA123-in',
        times: {
          ...createMockFlight().times,
          scheduledArrival: '2025-01-15T14:00:00Z',
          estimatedArrival: '2025-01-15T14:10:00Z', // 10 min delay
        },
        delayMinutes: 10,
      });

      const outgoing = createMockFlight({
        id: 'AA456-out',
        times: {
          ...createMockFlight().times,
          scheduledDeparture: '2025-01-15T15:00:00Z', // 50 min buffer
        },
      });

      (flightAwareService.getFlightById as jest.Mock)
        .mockResolvedValueOnce(incoming)
        .mockResolvedValueOnce(outgoing);

      // Act
      const result = await flightService.calculateConnectionRisk(incoming.id, outgoing.id);

      // Assert
      expect(result.risk.level).toBe(ConnectionRiskLevel.AT_RISK);
    });
  });

  // ===========================================================================
  // ON_TRACK Tests (healthy buffer)
  // ===========================================================================

  describe('ON_TRACK Detection', () => {
    it('should return ON_TRACK when buffer is 60+ minutes with no delays', async () => {
      // Arrange
      const incoming = createMockFlight({
        id: 'AA123-in',
        times: {
          ...createMockFlight().times,
          scheduledArrival: '2025-01-15T14:00:00Z',
          estimatedArrival: '2025-01-15T14:00:00Z',
        },
        delayMinutes: 0,
        status: FlightStatus.SCHEDULED,
      });

      const outgoing = createMockFlight({
        id: 'AA456-out',
        times: {
          ...createMockFlight().times,
          scheduledDeparture: '2025-01-15T15:15:00Z', // 75 min buffer
        },
      });

      (flightAwareService.getFlightById as jest.Mock)
        .mockResolvedValueOnce(incoming)
        .mockResolvedValueOnce(outgoing);

      // Act
      const result = await flightService.calculateConnectionRisk(incoming.id, outgoing.id);

      // Assert
      expect(result.risk.level).toBe(ConnectionRiskLevel.ON_TRACK);
      // Confidence is 0.75-0.95, so check it's at least 0.7
      expect(result.risk.confidence).toBeGreaterThan(0.7);
    });

    it('should return ON_TRACK when incoming is LANDED with good buffer', async () => {
      // Arrange
      const incoming = createMockFlight({
        id: 'AA123-in',
        status: FlightStatus.LANDED,
        times: {
          ...createMockFlight().times,
          scheduledArrival: '2025-01-15T14:00:00Z',
          actualArrival: '2025-01-15T13:55:00Z', // Early arrival!
        },
      });

      const outgoing = createMockFlight({
        id: 'AA456-out',
        times: {
          ...createMockFlight().times,
          scheduledDeparture: '2025-01-15T15:30:00Z', // 95 min buffer
        },
      });

      (flightAwareService.getFlightById as jest.Mock)
        .mockResolvedValueOnce(incoming)
        .mockResolvedValueOnce(outgoing);

      // Act
      const result = await flightService.calculateConnectionRisk(incoming.id, outgoing.id);

      // Assert
      expect(result.risk.level).toBe(ConnectionRiskLevel.ON_TRACK);
    });
  });

  // ===========================================================================
  // Risk Factors Tests
  // ===========================================================================

  describe('Risk Factors', () => {
    it('should include GATE_DISTANCE factor with NEGATIVE impact for terminal change', async () => {
      // Arrange
      const incoming = createMockFlight({
        id: 'AA123-in',
        route: {
          ...createMockFlight().route,
          destination: {
            ...createMockFlight().route.destination,
            terminal: 'T4',
          },
        },
        times: {
          ...createMockFlight().times,
          scheduledArrival: '2025-01-15T14:00:00Z',
        },
      });

      const outgoing = createMockFlight({
        id: 'AA456-out',
        route: {
          ...createMockFlight().route,
          origin: {
            ...createMockFlight().route.origin,
            terminal: 'T7', // Different terminal
          },
        },
        times: {
          ...createMockFlight().times,
          scheduledDeparture: '2025-01-15T15:00:00Z',
        },
      });

      (flightAwareService.getFlightById as jest.Mock)
        .mockResolvedValueOnce(incoming)
        .mockResolvedValueOnce(outgoing);

      // Act
      const result = await flightService.calculateConnectionRisk(incoming.id, outgoing.id);

      // Assert
      expect(result.risk.factors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'GATE_DISTANCE',
            impact: 'NEGATIVE',
          }),
        ])
      );
    });

    it('should include DELAY factor with NEGATIVE impact when incoming is delayed', async () => {
      // Arrange
      const incoming = createMockFlight({
        id: 'AA123-in',
        delayMinutes: 25,
        status: FlightStatus.DELAYED,
        times: {
          ...createMockFlight().times,
          scheduledArrival: '2025-01-15T14:00:00Z',
        },
      });

      const outgoing = createMockFlight({
        id: 'AA456-out',
        times: {
          ...createMockFlight().times,
          scheduledDeparture: '2025-01-15T15:30:00Z', // 90 min buffer
        },
      });

      (flightAwareService.getFlightById as jest.Mock)
        .mockResolvedValueOnce(incoming)
        .mockResolvedValueOnce(outgoing);

      // Act
      const result = await flightService.calculateConnectionRisk(incoming.id, outgoing.id);

      // Assert
      expect(result.risk.factors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'DELAY',
            impact: 'NEGATIVE',
          }),
        ])
      );
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should throw error when flight not found', async () => {
      // Arrange
      (flightAwareService.getFlightById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        flightService.calculateConnectionRisk('nonexistent', 'outgoing')
      ).rejects.toThrow();
    });
  });
});
