//
//  FlightListViewModel.swift
//  AeroSense
//
//  View model for flight list screen
//

import Foundation
import Combine

@MainActor
class FlightListViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var flights: [Flight] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var searchQuery = ""
    @Published var selectedDate = Date()
    @Published var searchType: SearchType = .byNumber

    // MARK: - Private Properties
    private let apiService: APIServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Enums
    enum SearchType {
        case byNumber
        case byRoute
    }

    // MARK: - Initialization
    init(apiService: APIServiceProtocol = APIClient()) {
        self.apiService = apiService
    }

    // MARK: - Public Methods
    func loadTrackedFlights() async {
        isLoading = true
        errorMessage = nil

        do {
            flights = try await apiService.getTrackedFlights()
        } catch {
            errorMessage = "Failed to load flights: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func searchFlights() async {
        isLoading = true
        errorMessage = nil

        // Clear previous results
        flights = []

        do {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let dateString = dateFormatter.string(from: selectedDate)

            let query = FlightSearchQuery(
                type: searchType == .byNumber ? .byNumber : .byRoute,
                airlineCode: extractAirlineCode(),
                flightNumber: extractFlightNumber(),
                originAirportCode: searchType == .byRoute ? searchQuery.uppercased() : nil,
                destinationAirportCode: nil,
                date: dateString
            )

            flights = try await apiService.searchFlights(query: query)
        } catch {
            errorMessage = "Search failed: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func trackFlight(_ flight: Flight) async {
        do {
            _ = try await apiService.trackFlight(flightId: flight.id)
        } catch {
            errorMessage = "Failed to track flight: \(error.localizedDescription)"
        }
    }

    func untrackFlight(_ flight: Flight) async {
        do {
            _ = try await apiService.untrackFlight(flightId: flight.id)
        } catch {
            errorMessage = "Failed to untrack flight: \(error.localizedDescription)"
        }
    }

    // MARK: - Helper Methods
    private func extractAirlineCode() -> String? {
        guard searchType == .byNumber else { return nil }
        let trimmed = searchQuery.trimmingCharacters(in: .whitespaces)
        let regex = try? NSRegularExpression(pattern: "^([A-Z]{2})")
        let range = NSRange(location: 0, length: trimmed.count)
        if let match = regex?.firstMatch(in: trimmed, range: range) {
            return (trimmed as NSString).substring(with: match.range(at: 1))
        }
        return nil
    }

    private func extractFlightNumber() -> String? {
        guard searchType == .byNumber else { return nil }
        let trimmed = searchQuery.trimmingCharacters(in: .whitespaces)
        let regex = try? NSRegularExpression(pattern: "(\\d+)$")
        let range = NSRange(location: 0, length: trimmed.count)
        if let match = regex?.firstMatch(in: trimmed, range: range) {
            return (trimmed as NSString).substring(with: match.range(at: 1))
        }
        return trimmed.isEmpty ? nil : trimmed
    }

    // MARK: - Formatted Display Helpers
    func formattedTime(_ isoDate: String?) -> String? {
        guard let isoDate = isoDate else { return nil }
        let dateFormatter = ISO8601DateFormatter()
        guard let date = dateFormatter.date(from: isoDate) else { return nil }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "HH:mm"
        displayFormatter.timeZone = TimeZone.current
        return displayFormatter.string(from: date)
    }

    func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}
