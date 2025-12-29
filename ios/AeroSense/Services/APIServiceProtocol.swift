//
//  APIServiceProtocol.swift
//  AeroSense
//
//  Protocol defining the API service interface for flight operations
//

import Foundation

/// Protocol defining the API service contract
/// This allows for mocking in tests and alternative implementations
protocol APIServiceProtocol {
    /// Fetch all tracked flights for the current user
    /// - Returns: Array of Flight objects
    /// - Throws: APIError for network or server errors
    func getTrackedFlights() async throws -> [Flight]

    /// Search for flights by number or route
    /// - Parameter query: FlightSearchQuery containing search parameters
    /// - Returns: Array of Flight objects
    /// - Throws: APIError for network or server errors
    func searchFlights(query: FlightSearchQuery) async throws -> [Flight]

    /// Track a flight for the current user
    /// - Parameter flightId: Unique identifier of the flight to track
    /// - Returns: Flight object that was tracked
    /// - Throws: APIError for network or server errors
    func trackFlight(flightId: String) async throws -> Flight

    /// Untrack (stop tracking) a flight
    /// - Parameter flightId: Unique identifier of the flight to untrack
    /// - Returns: Success confirmation
    /// - Throws: APIError for network or server errors
    func untrackFlight(flightId: String) async throws -> Bool

    /// Get details for a specific flight
    /// - Parameter flightId: Unique identifier of the flight
    /// - Returns: Flight object with full details
    /// - Throws: APIError for network or server errors
    func getFlight(flightId: String) async throws -> Flight

    /// Get connection risk analysis for a flight connection
    /// - Parameters:
    ///   - incomingFlightId: First flight in the connection
    ///   - outgoingFlightId: Second flight in the connection
    /// - Returns: Connection object with risk assessment
    /// - Throws: APIError for network or server errors
    func getConnectionRisk(incomingFlightId: String, outgoingFlightId: String) async throws -> Connection
}

// MARK: - APIClient Conformance

extension APIClient: APIServiceProtocol {
    /// Fetch all tracked flights for the current user
    func getTrackedFlights() async throws -> [Flight] {
        let endpoint = APIEndpoint.flightTracked.endpoint
        let response: ApiResponse<[Flight]> = try await request(endpoint.endpoint)
        return response.data
    }

    /// Search for flights by number or route
    func searchFlights(query: FlightSearchQuery) async throws -> [Flight] {
        var endpoint = APIEndpoint.flightSearch.endpoint

        var queryParams: [String: String] = [:]

        switch query.type {
        case .byNumber:
            if let airlineCode = query.airlineCode {
                queryParams["airlineCode"] = airlineCode
            }
            if let flightNumber = query.flightNumber {
                queryParams["flightNumber"] = flightNumber
            }
        case .byRoute:
            if let origin = query.originAirportCode {
                queryParams["origin"] = origin
            }
            if let destination = query.destinationAirportCode {
                queryParams["destination"] = destination
            }
        }

        if let date = query.date {
            queryParams["date"] = date
        }

        endpoint = endpoint.query(queryParams)

        let response: ApiResponse<[Flight]> = try await request(endpoint)
        return response.data
    }

    /// Track a flight for the current user
    func trackFlight(flightId: String) async throws -> Flight {
        let endpoint = APIEndpoint.trackFlight(flightId: flightId).endpoint
        let response: ApiResponse<Flight> = try await request(endpoint)
        return response.data
    }

    /// Untrack (stop tracking) a flight
    func untrackFlight(flightId: String) async throws -> Bool {
        let endpoint = APIEndpoint.untrackFlight(flightId: flightId).endpoint
        _ = try await request(endpoint) as ApiResponse<[String: Any]>
        return true
    }

    /// Get details for a specific flight
    func getFlight(flightId: String) async throws -> Flight {
        let endpoint = APIEndpoint.flightDetail(flightId: flightId).endpoint
        let response: ApiResponse<Flight> = try await request(endpoint)
        return response.data
    }

    /// Get connection risk analysis for a flight connection
    func getConnectionRisk(incomingFlightId: String, outgoingFlightId: String) async throws -> Connection {
        let endpoint = APIEndpoint.connectionRisk(
            incomingFlightId: incomingFlightId,
            outgoingFlightId: outgoingFlightId
        ).endpoint
        let response: ApiResponse<Connection> = try await request(endpoint)
        return response.data
    }
}
