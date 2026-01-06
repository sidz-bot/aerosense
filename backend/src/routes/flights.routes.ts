/**
 * Flight Routes
 * HTTP endpoints for flight operations
 * PHASE 6: Added rate limiting to all public endpoints
 */

import { FastifyInstance } from 'fastify';
import { flightService } from '../services/flight.service';
import { createRoleBasedRateLimiter } from '../middleware/rate-limit.middleware';
import type { FlightSearchQuery, ApiResponse, ApiError } from '../types/flight.types';

export async function flightRoutes(fastify: FastifyInstance) {
  // PHASE 6: Apply role-based rate limiting to all flight routes
  const rateLimiter = createRoleBasedRateLimiter();

  /**
   * GET /api/v1/flights/search
   * Search for flights by number or route
   * PHASE 6: Rate limited
   */
  fastify.get('/search', {
    onRequest: [rateLimiter],
  }, async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;

      // Determine search type
      let searchType: 'BY_NUMBER' | 'BY_ROUTE';
      let searchQuery: FlightSearchQuery;

      if (query.flightNumber) {
        // Search by flight number
        searchType = 'BY_NUMBER';
        searchQuery = {
          type: searchType,
          airlineCode: query.airlineCode || extractAirlineCode(query.flightNumber),
          flightNumber: extractFlightNumber(query.flightNumber),
          date: query.date || new Date().toISOString().split('T')[0],
        };
      } else {
        // Search by route
        searchType = 'BY_ROUTE';
        searchQuery = {
          type: searchType,
          originAirportCode: query.origin?.toUpperCase(),
          destinationAirportCode: query.destination?.toUpperCase(),
          date: query.date || new Date().toISOString().split('T')[0],
        };
      }

      const results = await flightService.searchFlights(searchQuery);

      const response: ApiResponse<typeof results> = {
        data: results,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          cached: false,
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      const errResponse: ApiError = {
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to search flights',
        },
      };
      return reply.code(400).send(errResponse);
    }
  });

  /**
   * GET /api/v1/flights/:id
   * Get a specific flight by ID
   * PHASE 6: Rate limited
   */
  fastify.get('/:id', {
    onRequest: [rateLimiter],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const flight = await flightService.getFlight(id);

      const response: ApiResponse<typeof flight> = {
        data: flight,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          cached: false,
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      const errResponse: ApiError = {
        error: {
          code: 'FLIGHT_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Flight not found',
          details: {
            flightId: (request.params as { id: string }).id,
          },
        },
      };
      return reply.code(404).send(errResponse);
    }
  });

  /**
   * GET /api/v1/flights/:id/connections
   * Get connection risk analysis for a flight
   * Query params: outgoingFlightId
   * PHASE 6: Rate limited
   */
  fastify.get('/:id/connections', {
    onRequest: [rateLimiter],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { outgoingFlightId } = request.query as { outgoingFlightId?: string };

      if (!outgoingFlightId) {
        const errResponse: ApiError = {
          error: {
            code: 'MISSING_PARAMETER',
            message: 'outgoingFlightId query parameter is required',
          },
        };
        return reply.code(400).send(errResponse);
      }

      const connection = await flightService.calculateConnectionRisk(id, outgoingFlightId);

      const response: ApiResponse<typeof connection> = {
        data: connection,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          cached: false,
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      const errResponse: ApiError = {
        error: {
          code: 'CONNECTION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to calculate connection risk',
        },
      };
      return reply.code(400).send(errResponse);
    }
  });

  /**
   * POST /api/v1/flights/:id/track
   * Track a flight for the authenticated user
   * PHASE 6: Rate limited + authenticated
   */
  fastify.post('/:id/track', {
    onRequest: [rateLimiter, fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.sub;

      if (!userId) {
        const errResponse: ApiError = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
          },
        };
        return reply.code(401).send(errResponse);
      }

      const flight = await flightService.trackFlight(userId, id);

      const response: ApiResponse<typeof flight> = {
        data: flight,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      const errResponse: ApiError = {
        error: {
          code: 'TRACK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to track flight',
        },
      };
      return reply.code(400).send(errResponse);
    }
  });

  /**
   * DELETE /api/v1/flights/:id/track
   * Untrack a flight for the authenticated user
   * PHASE 6: Rate limited + authenticated
   */
  fastify.delete('/:id/track', {
    onRequest: [rateLimiter, fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.sub;

      if (!userId) {
        const errResponse: ApiError = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
          },
        };
        return reply.code(401).send(errResponse);
      }

      await flightService.untrackFlight(userId, id);

      return reply.code(204).send();
    } catch (error) {
      const errResponse: ApiError = {
        error: {
          code: 'UNTRACK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to untrack flight',
        },
      };
      return reply.code(400).send(errResponse);
    }
  });

  /**
   * GET /api/v1/flights/tracked
   * Get all tracked flights for the authenticated user
   * PHASE 6: Rate limited + authenticated
   */
  fastify.get('/tracked', {
    onRequest: [rateLimiter, fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.sub;

      if (!userId) {
        const errResponse: ApiError = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
          },
        };
        return reply.code(401).send(errResponse);
      }

      const flights = await flightService.getTrackedFlights(userId);

      const response: ApiResponse<typeof flights> = {
        data: flights,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      const errResponse: ApiError = {
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch tracked flights',
        },
      };
      return reply.code(400).send(errResponse);
    }
  });
}

// Helper functions

/**
 * Extract airline code from flight number (e.g., "AA1234" -> "AA")
 */
function extractAirlineCode(flightNumber: string): string {
  const match = flightNumber.match(/^([A-Z]{2})/);
  return match ? match[1] : 'AA';
}

/**
 * Extract numeric flight number (e.g., "AA1234" -> "1234")
 */
function extractFlightNumber(flightNumber: string): string {
  const match = flightNumber.match(/(\d+)$/);
  return match ? match[1] : flightNumber;
}
