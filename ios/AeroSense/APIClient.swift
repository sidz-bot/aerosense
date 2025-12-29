//
//  APIClient.swift
//  AeroSense
//
//  Network Layer - Handles all HTTP communication with backend APIs
//  Aligned with Architecture.md - Single responsibility for HTTP communication
//

import Foundation

// MARK: - API Client

/// Single responsibility: HTTP communication with backend APIs
/// Implements retry logic, authentication injection, request throttling
@MainActor
class APIClient: ObservableObject {

    // MARK: - Properties

    static let shared = APIClient()

    private let session: URLSession
    private let baseURL: String

    @Published var isLoading: Bool = false
    @Published var lastError: APIError?

    private lazy var decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    private lazy var encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    // MARK: - Initialization

    private init() {
        // Configure URL session for API requests
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30.0
        configuration.timeoutIntervalForResource = 60.0
        configuration.httpMaximumConnectionsPerHost = 4

        self.session = URLSession(configuration: configuration)
        self.baseURL = Configuration.apiBaseURL
    }

    // MARK: - Public Methods

    /// Generic request method for all API calls
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        isLoading = true
        lastError = nil
        defer { isLoading = false }

        // Add delay to simulate network (for development)
        try await Task.sleep(nanoseconds: UInt64.random(in: 50_000_000...200_000_000))

        // For mock data mode, return mock responses
        if Configuration.useMockData {
            return try await fetchMockData(for: endpoint)
        }

        // Real API request
        let request = try buildRequest(for: endpoint)

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            try handleHTTPResponse(httpResponse, data: data)

            let result = try decoder.decode(T.self, from: data)
            return result

        } catch let error as APIError {
            self.lastError = error
            throw error
        } catch {
            let apiError = APIError.networkError(underlying: error)
            self.lastError = apiError
            throw apiError
        }
    }

    /// Authenticated request (adds JWT token)
    func authRequest<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        // TODO: Add JWT token from Keychain
        return try await request(endpoint)
    }

    // MARK: - Private Methods

    private func buildRequest(for endpoint: Endpoint) throws -> URLRequest {
        let urlString = baseURL + endpoint.path
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        // Add body if present
        if let body = endpoint.body {
            request.httpBody = try encoder.encode(body)
        }

        // Add query parameters
        if !endpoint.queryParameters.isEmpty {
            var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            components.queryItems = endpoint.queryParameters.map { key, value in
                URLQueryItem(name: key, value: value)
            }
            request.url = components.url
        }

        // TODO: Add authentication token
        // if let token = Keychain.shared.getAccessToken() {
        //     request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        // }

        return request
    }

    private func handleHTTPResponse(_ response: HTTPURLResponse, data: Data) throws {
        switch response.statusCode {
        case 200...299:
            return // Success
        case 400...499:
            let errorResponse = try? decoder.decode(ErrorResponse.self, from: data)
            throw APIError.clientError(
                code: response.statusCode,
                message: errorResponse?.error.message ?? "Client error"
            )
        case 500...599:
            throw APIError.serverError(code: response.statusCode)
        default:
            throw APIError.invalidResponse
        }
    }

    private func fetchMockData<T: Decodable>(for endpoint: Endpoint) async throws -> T {
        // Mock implementation for development
        switch endpoint.path {
        case "/api/v1/flights/search":
            return try MockFlightData.searchResults() as! T
        case let path where path.contains("/api/v1/flights/") && path.contains("/connections"):
            return try MockFlightData.connectionRisk() as! T
        default:
            throw APIError.noData
        }
    }
}

// MARK: - API Endpoint

/// Type-safe API endpoint definitions
enum APIEndpoint {
    case flightSearch
    case flightDetail(flightId: String)
    case flightTracked
    case trackFlight(flightId: String)
    case untrackFlight(flightId: String)
    case connectionRisk(incomingFlightId: String, outgoingFlightId: String)

    var endpoint: Endpoint {
        switch self {
        case .flightSearch:
            return Endpoint(path: "/api/v1/flights/search", method: .get)
        case .flightDetail(let flightId):
            return Endpoint(path: "/api/v1/flights/\(flightId)", method: .get)
        case .flightTracked:
            return Endpoint(path: "/api/v1/flights/tracked", method: .get)
        case .trackFlight(let flightId):
            return Endpoint(path: "/api/v1/flights/\(flightId)/track", method: .post)
        case .untrackFlight(let flightId):
            return Endpoint(path: "/api/v1/flights/\(flightId)/track", method: .delete)
        case .connectionRisk(let incomingId, let outgoingId):
            return Endpoint(
                path: "/api/v1/flights/\(incomingId)/connections",
                method: .get
            ).query(["outgoingFlightId": outgoingId])
        }
    }
}

// MARK: - Endpoint

struct Endpoint {
    enum Method: String {
        case get = "GET"
        case post = "POST"
        case patch = "PATCH"
        case delete = "DELETE"
    }

    let path: String
    let method: Method
    let body: Encodable?
    var queryParameters: [String: String] = [:]

    init(path: String, method: Method = .get, body: Encodable? = nil) {
        self.path = path
        self.method = method
        self.body = body
    }

    func query(_ parameters: [String: String]) -> Endpoint {
        var endpoint = self
        endpoint.queryParameters = parameters
        return endpoint
    }
}

// MARK: - API Error

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case noData
    case decodingError(Error)
    case networkError(underlying: Error)
    case clientError(code: Int, message: String)
    case serverError(code: Int)
    case unauthorized
    case rateLimitExceeded

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .noData:
            return "No data received"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .clientError(_, let message):
            return message
        case .serverError(let code):
            return "Server error (code: \(code))"
        case .unauthorized:
            return "Authentication required"
        case .rateLimitExceeded:
            return "Too many requests. Please try again later."
        }
    }
}

// MARK: - Error Response

struct ErrorResponse: Decodable {
    struct ErrorDetail: Decodable {
        let code: String
        let message: String
        let details: [String: String]?
    }

    let error: ErrorDetail
}

// MARK: - API Response

struct ApiResponse<T: Decodable>: Decodable {
    let data: T
    let meta: ResponseMeta?
}

struct ResponseMeta: Decodable {
    let timestamp: String
    let version: String
    let cached: Bool?
}

// MARK: - Configuration

enum Configuration {
    static var apiBaseURL: String {
        #if DEBUG
        return "http://localhost:3000"
        #else
        return "https://api.aerosense.app"
        #endif
    }

    static var useMockData: Bool {
        #if DEBUG
        return true // Use mock data in development
        #else
        return false
        #endif
    }
}

// MARK: - Mock Data

enum MockFlightData {
    static func searchResults() throws -> ApiResponse<[FlightSearchResult]> {
        ApiResponse(
            data: [
                FlightSearchResult(
                    flight: Flight(
                        id: "AA_1234_2025-01-15",
                        airlineCode: "AA",
                        airlineName: "American Airlines",
                        flightNumber: "1234",
                        route: Flight.Route(
                            origin: Airport(code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States", terminal: "T4", gate: "B12"),
                            destination: Airport(code: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", terminal: "T4", gate: "C22")
                        ),
                        times: Flight.Times(
                            scheduledDeparture: "2025-01-15T10:00:00Z",
                            scheduledArrival: "2025-01-15T18:30:00Z",
                            estimatedDeparture: "2025-01-15T10:15:00Z",
                            estimatedArrival: "2025-01-15T18:45:00Z"
                        ),
                        status: .delayed,
                        delayMinutes: 15,
                        lastUpdated: "2025-01-15T08:30:00Z"
                    ),
                    confidence: 0.95
                ),
            ],
            meta: ResponseMeta(timestamp: ISO8601DateFormatter().string(from: Date()), version: "1.0.0", cached: false)
        )
    }

    static func connectionRisk() throws -> ApiResponse<Connection> {
        ApiResponse(
            data: Connection(
                id: "conn_AA_1234_UA_567",
                incomingFlight: Flight(
                    id: "AA_1234_2025-01-15",
                    airlineCode: "AA",
                    airlineName: "American Airlines",
                    flightNumber: "1234",
                    route: Flight.Route(
                        origin: Airport(code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States"),
                        destination: Airport(code: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States")
                    ),
                    times: Flight.Times(
                        scheduledDeparture: "2025-01-15T10:00:00Z",
                        scheduledArrival: "2025-01-15T18:30:00Z"
                    ),
                    status: .onTime,
                    lastUpdated: "2025-01-15T08:30:00Z"
                ),
                outgoingFlight: Flight(
                    id: "UA_567_2025-01-15",
                    airlineCode: "UA",
                    airlineName: "United Airlines",
                    flightNumber: "567",
                    route: Flight.Route(
                        origin: Airport(code: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States"),
                        destination: Airport(code: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom")
                    ),
                    times: Flight.Times(
                        scheduledDeparture: "2025-01-15T19:30:00Z",
                        scheduledArrival: "2025-01-16T07:45:00Z"
                    ),
                    status: .scheduled,
                    lastUpdated: "2025-01-15T08:30:00Z"
                ),
                risk: ConnectionRisk(
                    level: .onTrack,
                    bufferMinutes: 38,
                    confidence: 0.92
                )
            ),
            meta: ResponseMeta(timestamp: ISO8601DateFormatter().string(from: Date()), version: "1.0.0")
        )
    }
}

// MARK: - Models (Simplified for Swift)

struct Flight: Decodable {
    let id: String
    let airlineCode: String
    let airlineName: String
    let flightNumber: String
    let route: Route
    let times: Times
    let status: Status
    let delayMinutes: Int?
    let lastUpdated: String

    struct Route: Decodable {
        let origin: Airport
        let destination: Airport
    }

    struct Times: Decodable {
        let scheduledDeparture: String
        let scheduledArrival: String
        let estimatedDeparture: String?
        let estimatedArrival: String?
    }

    enum Status: String, Decodable {
        case scheduled = "SCHEDULED"
        case delayed = "DELAYED"
        case onTime = "ON_TIME"
        case inAir = "IN_AIR"
        case landed = "LANDED"
        case canceled = "CANCELED"
        case boarding = "BOARDING"
    }
}

struct Airport: Decodable {
    let code: String
    let name: String
    let city: String
    let country: String
    let terminal: String?
    let gate: String?
}

struct FlightSearchResult: Decodable {
    let flight: Flight
    let confidence: Double
}

struct Connection: Decodable {
    let id: String
    let incomingFlight: Flight
    let outgoingFlight: Flight
    let risk: ConnectionRisk
}

struct ConnectionRisk: Decodable {
    let level: RiskLevel
    let bufferMinutes: Int
    let confidence: Double

    enum RiskLevel: String, Decodable {
        case onTrack = "ON_TRACK"
        case atRisk = "AT_RISK"
        case highRisk = "HIGH_RISK"
        case critical = "CRITICAL"
    }
}
