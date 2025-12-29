/**
 * Flight Data Types
 * Aligned with Architecture.md specification
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum FlightStatus {
  SCHEDULED = 'SCHEDULED',
  DELAYED = 'DELAYED',
  IN_AIR = 'IN_AIR',
  LANDED = 'LANDED',
  CANCELED = 'CANCELED',
  BOARDING = 'BOARDING',
  DEPARTED = 'DEPARTED',
}

export enum ConnectionRiskLevel {
  ON_TRACK = 'ON_TRACK',      // > 45 min buffer, green
  AT_RISK = 'AT_RISK',        // 30-45 min buffer, orange
  HIGH_RISK = 'HIGH_RISK',    // 20-30 min buffer, red-orange
  CRITICAL = 'CRITICAL',      // < 20 min buffer, red
}

export enum NotificationType {
  GATE_CHANGE = 'GATE_CHANGE',
  DELAY_ALERT = 'DELAY_ALERT',
  CONNECTION_RISK = 'CONNECTION_RISK',
  FLIGHT_CANCELED = 'FLIGHT_CANCELED',
  BOARDING_STARTED = 'BOARDING_STARTED',
}

// ============================================================================
// FLIGHT TYPES
// ============================================================================

export interface Airport {
  code: string;           // e.g., "LAX", "JFK"
  name: string;           // e.g., "Los Angeles International"
  city: string;           // e.g., "Los Angeles"
  country: string;        // e.g., "United States"
  terminal?: string;      // e.g., "T4"
  gate?: string;          // e.g., "B12"
  latitude?: number;
  longitude?: number;
}

export interface FlightTimes {
  scheduledDeparture: string;  // ISO 8601
  scheduledArrival: string;    // ISO 8601
  estimatedDeparture?: string; // ISO 8601
  estimatedArrival?: string;   // ISO 8601
  actualDeparture?: string;    // ISO 8601
  actualArrival?: string;      // ISO 8601
}

export interface Flight {
  id: string;                  // Unique identifier: "{airlineCode}_{flightNumber}_{date}"
  airlineCode: string;         // e.g., "AA", "UA", "DL"
  airlineName: string;         // e.g., "American Airlines"
  flightNumber: string;        // e.g., "1234"
  route: {
    origin: Airport;
    destination: Airport;
  };
  times: FlightTimes;
  status: FlightStatus;
  aircraft?: {
    type: string;              // e.g., "Boeing 737-800"
    registration?: string;
  };
  baggage?: {
    claim?: string;            // e.g., "Carousel 5"
  };
  delayMinutes?: number;       // Current delay in minutes
  lastUpdated: string;         // ISO 8601 timestamp
}

export interface TrackedFlight extends Flight {
  userId: string;
  trackedAt: string;           // ISO 8601 timestamp
  notificationPreferences: {
    gateChanges: boolean;
    delays: boolean;
    boarding: boolean;
    connectionRisk: boolean;
  };
}

// ============================================================================
// CONNECTION TYPES
// ============================================================================

export interface Connection {
  id: string;
  incomingFlight: Flight;
  outgoingFlight: Flight;
  risk: ConnectionRisk;
  alternatives?: AlternativeFlight[];
}

export interface ConnectionRisk {
  level: ConnectionRiskLevel;
  bufferMinutes: number;       // Time between flights
  factors: RiskFactor[];
  confidence: number;          // 0-1, probability assessment
  calculatedAt: string;        // ISO 8601 timestamp
}

export interface RiskFactor {
  type: 'DELAY' | 'CONNECTION_TIME' | 'GATE_DISTANCE' | 'HISTORICAL';
  description: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  weight: number;              // 0-1, contribution to risk score
}

export interface AlternativeFlight {
  flight: Flight;
  availableSeats: number;
  airline: string;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface FlightSearchQuery {
  type: 'BY_NUMBER' | 'BY_ROUTE' | 'BY_DATE';
  flightNumber?: string;       // e.g., "AA1234"
  airlineCode?: string;        // e.g., "AA"
  originAirportCode?: string;  // e.g., "LAX"
  destinationAirportCode?: string; // e.g., "JFK"
  date?: string;               // YYYY-MM-DD
}

export interface FlightSearchResult {
  flight: Flight;
  confidence: number;          // Match confidence
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    cached?: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  flightId: string;
  type: NotificationType;
  payload: NotificationPayload;
  sentAt: string;
  readAt?: string;
}

export type NotificationPayload =
  | GateChangePayload
  | DelayAlertPayload
  | ConnectionRiskPayload
  | FlightCanceledPayload
  | BoardingStartedPayload;

export interface GateChangePayload {
  flightId: string;
  oldGate: string;
  newGate: string;
  oldTerminal?: string;
  newTerminal?: string;
  walkingTimeMinutes?: number;
}

export interface DelayAlertPayload {
  flightId: string;
  delayMinutes: number;
  oldDeparture: string;
  newDeparture: string;
  reason?: string;
}

export interface ConnectionRiskPayload {
  incomingFlightId: string;
  outgoingFlightId: string;
  previousRisk: ConnectionRiskLevel;
  currentRisk: ConnectionRiskLevel;
  connectionTimeMinutes: number;
}

export interface FlightCanceledPayload {
  flightId: string;
  reason?: string;
  alternativeFlights?: AlternativeFlight[];
}

export interface BoardingStartedPayload {
  flightId: string;
  gate: string;
  boardingTime: string;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: string;
  subscriptionTier: 'FREE' | 'PREMIUM';
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;    // HH:mm format
  quietHoursEnd?: string;      // HH:mm format
  gateChanges: boolean;
  delays: boolean;
  boarding: boolean;
  connectionRisk: boolean;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CacheKey {
  flight: (flightId: string, date: string) => string;
  userTrackedFlights: (userId: string) => string;
  connectionRisk: (incomingId: string, outgoingId: string) => string;
}

export const CacheKeys: CacheKey = {
  flight: (id, date) => `flight:${id}:${date}`,
  userTrackedFlights: (userId) => `flights:user:${userId}:tracked`,
  connectionRisk: (incomingId, outgoingId) => `connections:${incomingId}:${outgoingId}`,
};
