/**
 * Database Helper Functions
 *
 * Common database operations and utility functions
 */

import { db } from './database';
export { db } from './database';
import type { Flight } from '@prisma/client';

/**
 * Find user by email (for authentication)
 */
export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    include: {
      deviceTokens: true,
    },
  });
}

/**
 * Find user by ID
 */
export async function findUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      name: true,
      role: true,
      avatarUrl: true,
      refreshToken: true,
      notificationEnabled: true,
      gateChangeAlerts: true,
      delayAlerts: true,
      boardingAlerts: true,
      connectionRiskAlerts: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

/**
 * Get all tracked flights for a user
 */
export async function getUserTrackedFlights(userId: string) {
  return db.userFlight.findMany({
    where: { userId },
    include: {
      flight: {
        include: {
          origin: true,
          destination: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get flight by ID with full details
 */
export async function getFlightById(flightId: string) {
  return db.flight.findUnique({
    where: { id: flightId },
    include: {
      origin: true,
      destination: true,
    },
  });
}

/**
 * Search flights by airline code and flight number
 */
export async function searchFlightsByNumber(
  airlineCode: string,
  flightNumber: string,
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return db.flight.findMany({
    where: {
      airlineCode: airlineCode.toUpperCase(),
      flightNumber: flightNumber,
      scheduledDeparture: {
        gte: startOfDay.toISOString(),
        lte: endOfDay.toISOString(),
      },
    },
    include: {
      origin: true,
      destination: true,
    },
  });
}

/**
 * Search flights by route
 */
export async function searchFlightsByRoute(
  originCode: string,
  destinationCode: string,
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return db.flight.findMany({
    where: {
      origin: {
        code: originCode.toUpperCase(),
      },
      destination: {
        code: destinationCode.toUpperCase(),
      },
      scheduledDeparture: {
        gte: startOfDay.toISOString(),
        lte: endOfDay.toISOString(),
      },
    },
    include: {
      origin: true,
      destination: true,
    },
  });
}

/**
 * Create or update flight data
 */
export async function upsertFlight(data: Omit<Flight, 'id' | 'createdAt' | 'updatedAt'>) {
  return db.flight.upsert({
    where: {
      airlineCode_flightNumber_scheduledDeparture: {
        airlineCode: data.airlineCode,
        flightNumber: data.flightNumber,
        scheduledDeparture: data.scheduledDeparture,
      },
    },
    create: data,
    update: {
      ...data,
      lastFetchedAt: new Date(),
    },
  });
}

/**
 * Track a flight for a user
 */
export async function trackFlight(
  userId: string,
  flightId: string,
  options?: {
    connectionFlightId?: string;
    notes?: string;
  }
) {
  return db.userFlight.create({
    data: {
      userId,
      flightId,
      connectionFlightId: options?.connectionFlightId,
      notes: options?.notes,
    },
    include: {
      flight: {
        include: {
          origin: true,
          destination: true,
        },
      },
    },
  });
}

/**
 * Remove flight from user's tracked flights
 */
export async function untrackFlight(userId: string, flightId: string) {
  return db.userFlight.deleteMany({
    where: {
      userId,
      flightId,
    },
  });
}

/**
 * Log a flight change for audit trail
 */
export async function logFlightChange(params: {
  flightId: string;
  type: 'GATE_CHANGE' | 'TIME_CHANGE' | 'STATUS_CHANGE' | 'DELAY_UPDATE' | 'CANCELLATION';
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  source?: string;
}) {
  return db.flightChangeLog.create({
    data: {
      flightId: params.flightId,
      type: params.type,
      oldValue: params.oldValue as any,
      newValue: params.newValue as any,
      source: params.source || 'FlightAware',
    },
  });
}

/**
 * Get recent flight changes
 */
export async function getRecentFlightChanges(flightId: string, limit = 10) {
  return db.flightChangeLog.findMany({
    where: { flightId },
    orderBy: { detectedAt: 'desc' },
    take: limit,
  });
}

/**
 * Register device token for push notifications
 */
export async function registerDeviceToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android'
) {
  return db.deviceToken.upsert({
    where: {
      userId_token: {
        userId,
        token,
      },
    },
    create: {
      userId,
      token,
      platform,
    },
    update: {
      createdAt: new Date(),
    },
  });
}

/**
 * Unregister (delete) device token for a user
 */
export async function unregisterDeviceToken(userId: string, token: string) {
  return db.deviceToken.deleteMany({
    where: {
      userId,
      token,
    },
  });
}

/**
 * Get all device tokens for a user
 */
export async function getUserDeviceTokens(userId: string) {
  return db.deviceToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create notification record
 */
export async function createNotification(params: {
  userId: string;
  flightId: string;
  type: 'GATE_CHANGE' | 'DELAY' | 'BOARDING_SOON' | 'CONNECTION_RISK' | 'CONNECTION_STATUS_CHANGE' | 'FLIGHT_CANCELED';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  return db.notification.create({
    data: {
      userId: params.userId,
      flightId: params.flightId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data as any,
    },
  });
}

/**
 * Get recent notifications for a user
 */
export async function getUserNotifications(userId: string, limit = 20) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
