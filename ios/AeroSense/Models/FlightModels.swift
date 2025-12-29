//
//  FlightModels.swift
//  AeroSense
//
//  Data models for flights
//

import Foundation

// MARK: - Flight Status
enum FlightStatus: String, Codable {
    case scheduled = "SCHEDULED"
    case delayed = "DELAYED"
    case inAir = "IN_AIR"
    case landed = "LANDED"
    case canceled = "CANCELED"
    case boarding = "BOARDING"
    case departed = "DEPARTED"
    case diverted = "DIVERTED"
}

// MARK: - Connection Risk Level
enum ConnectionRiskLevel: String, Codable {
    case onTrack = "ON_TRACK"
    case atRisk = "AT_RISK"
    case highRisk = "HIGH_RISK"
    case critical = "CRITICAL"
}

// MARK: - Airport
struct Airport: Codable, Hashable {
    let code: String
    let name: String
    let city: String
    let country: String?
    let terminal: String?
    let gate: String?
    let latitude: Double?
    let longitude: Double?
}

// MARK: - Flight Times
struct FlightTimes: Codable {
    let scheduledDeparture: String
    let scheduledArrival: String
    let estimatedDeparture: String?
    let estimatedArrival: String?
    let actualDeparture: String?
    let actualArrival: String?
}

// MARK: - Flight Route
struct FlightRoute: Codable {
    let origin: Airport
    let destination: Airport
}

// MARK: - Flight
struct Flight: Codable, Identifiable, Hashable {
    let id: String
    let airlineCode: String
    let airlineName: String
    let flightNumber: String
    let route: FlightRoute
    let times: FlightTimes
    let status: FlightStatus
    let delayMinutes: Int?
    let aircraft: AircraftInfo?
    let baggage: BaggageInfo?
    let lastUpdated: String
}

struct AircraftInfo: Codable {
    let type: String
    let registration: String?
}

struct BaggageInfo: Codable {
    let claim: String?
}

// MARK: - Connection Risk
struct ConnectionRisk: Codable {
    let level: ConnectionRiskLevel
    let bufferMinutes: Int
    let factors: [RiskFactor]
    let confidence: Double
    let calculatedAt: String
}

struct RiskFactor: Codable {
    let type: String
    let description: String
    let impact: String
    let weight: Double
}

// MARK: - Connection
struct Connection: Codable, Identifiable {
    let id: String
    let incomingFlight: Flight
    let outgoingFlight: Flight
    let risk: ConnectionRisk
    let alternatives: [AlternativeFlight]?
}

struct AlternativeFlight: Codable {
    let flight: Flight
    let availableSeats: Int
    let airline: String
}

// MARK: - API Response
struct ApiResponse<T: Codable>: Codable {
    let data: T
    let meta: ResponseMeta?
}

struct ResponseMeta: Codable {
    let timestamp: String
    let version: String
    let cached: Bool?
}

// MARK: - Tracked Flight
struct TrackedFlight: Identifiable, Codable {
    let id: String
    let flight: Flight
    let trackedAt: Date
    let notificationPreferences: NotificationPreferences
}

struct NotificationPreferences: Codable {
    let gateChanges: Bool
    let delays: Bool
    let boarding: Bool
    let connectionRisk: Bool
}

// MARK: - Flight Search Query
struct FlightSearchQuery {
    let type: SearchType
    let airlineCode: String?
    let flightNumber: String?
    let originAirportCode: String?
    let destinationAirportCode: String?
    let date: String

    enum SearchType: String {
        case byNumber = "BY_NUMBER"
        case byRoute = "BY_ROUTE"
    }
}
