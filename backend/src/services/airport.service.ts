/**
 * Airport Service
 *
 * Handles airport data operations and ensures airports exist in database
 */

import { db } from '../utils/database';
import { logger } from '../utils/logger';
import type { Airport } from '@prisma/client';

export class AirportService {
  private airportCache: Map<string, Airport> = new Map();

  /**
   * Get or create airport by code
   * Returns the airport ID for use in flight records
   */
  async getOrCreateAirport(code: string, data?: {
    name?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  }): Promise<string> {
    const upperCode = code.toUpperCase();

    // Check cache first
    if (this.airportCache.has(upperCode)) {
      return this.airportCache.get(upperCode)!.id;
    }

    // Try to find existing airport
    let airport = await db.airport.findUnique({
      where: { code: upperCode },
    });

    // Create if doesn't exist
    if (!airport) {
      airport = await db.airport.create({
        data: {
          id: upperCode, // Use IATA code as ID
          code: upperCode,
          name: data?.name || `${upperCode} Airport`,
          city: data?.city || 'Unknown',
          country: data?.country || 'Unknown',
          latitude: data?.latitude || 0,
          longitude: data?.longitude || 0,
          timezone: data?.timezone || 'America/New_York',
        },
      });

      logger.info({ code: upperCode }, 'Airport: created new airport record');
    }

    // Cache for future use
    this.airportCache.set(upperCode, airport);

    return airport.id;
  }

  /**
   * Preload common airports into cache
   */
  async preloadCommonAirports(): Promise<void> {
    const airports = await db.airport.findMany({
      take: 100, // Limit to 100 most common
    });

    for (const airport of airports) {
      this.airportCache.set(airport.code, airport);
    }

    logger.info(
      { count: airports.length },
      'Airport: preloaded airports into cache'
    );
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.airportCache.clear();
  }
}

// Export singleton
export const airportService = new AirportService();
