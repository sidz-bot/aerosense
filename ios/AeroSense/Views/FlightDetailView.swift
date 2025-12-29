//
//  FlightDetailView.swift
//  AeroSense
//
//  Flight detail screen with real-time status
//

import SwiftUI

struct FlightDetailView: View {
    let flight: Flight
    @State private var isTracking = false
    @State private var showingConnectionRisk = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Status Card
                statusCard

                // Route Card
                routeCard

                // Times Card
                timesCard

                // Aircraft & Gate Info
                if flight.aircraft != nil || flight.route.destination.gate != nil {
                    detailsCard
                }

                // Connection Risk (if applicable)
                connectionRiskButton
            }
            .padding()
        }
        .navigationTitle("\(flight.airlineCode) \(flight.flightNumber)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    Task {
                        await toggleTracking()
                    }
                } label: {
                    Image(systemName: isTracking ? "bell.fill" : "bell")
                        .foregroundColor(isTracking ? .blue : .gray)
                }
            }
        }
    }

    // MARK: - Status Card
    private var statusCard: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: statusIcon)
                    .font(.title)
                    .foregroundColor(statusColor)
                Text(statusText)
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
            }

            if let delay = flight.delayMinutes, delay > 0 {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Delayed by \(delay) minutes")
                        .font(.subheadline)
                }
            }
        }
        .padding()
        .background(statusColor.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Route Card
    private var routeCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Route")
                .font(.headline)

            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text(flight.route.origin.code)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                    Text(flight.route.origin.city)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    if let terminal = flight.route.origin.terminal {
                        Text("Terminal \(terminal)")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.gray.opacity(0.2))
                            .clipShape(Capsule())
                    }
                }

                Spacer()

                VStack(spacing: 8) {
                    Image(systemName: "airplane")
                        .font(.title3)
                        .foregroundColor(.blue)
                    Text("→")
                        .font(.title)
                        .foregroundColor(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 8) {
                    Text(flight.route.destination.code)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                    Text(flight.route.destination.city)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    if let terminal = flight.route.destination.terminal {
                        Text("Terminal \(terminal)")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.gray.opacity(0.2))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    // MARK: - Times Card
    private var timesCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Schedule")
                .font(.headline)

            timeRow(label: "Departure", scheduled: flight.times.scheduledDeparture, estimated: flight.times.estimatedDeparture, actual: flight.times.actualDeparture)
            timeRow(label: "Arrival", scheduled: flight.times.scheduledArrival, estimated: flight.times.estimatedArrival, actual: flight.times.actualArrival)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func timeRow(label: String, scheduled: String, estimated: String?, actual: String?) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(formatTime(scheduled))
                    .font(.body)
                if let estimated = estimated, estimated != scheduled {
                    Text("Est: \(formatTime(estimated))")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                if let actual = actual {
                    Text("Actual: \(formatTime(actual))")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }
        }
    }

    // MARK: - Details Card
    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Details")
                .font(.headline)

            if let aircraft = flight.aircraft {
                detailRow(icon: "airplane", label: "Aircraft", value: aircraft.type)
            }

            if let gate = flight.route.destination.gate {
                detailRow(icon: "door.sliding.left.hand.closed", label: "Gate", value: gate)
            }

            if let baggage = flight.baggage, let claim = baggage.claim {
                detailRow(icon: "suitcase.cart", label: "Baggage", value: "Carousel \(claim)")
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func detailRow(icon: String, label: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.blue)
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
    }

    // MARK: - Connection Risk Button
    private var connectionRiskButton: some View {
        Button {
            showingConnectionRisk = true
        } label: {
            HStack {
                Image(systemName: "exclamationmark.triangle")
                Text("Check Connection Risk")
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.orange.opacity(0.1))
            .foregroundColor(.orange)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .sheet(isPresented: $showingConnectionRisk) {
            ConnectionRiskView(flightId: flight.id)
        }
    }

    // MARK: - Helpers
    private var statusIcon: String {
        switch flight.status {
        case .scheduled: return "calendar"
        case .boarding: return "figure.walk"
        case .departed, .inAir: return "airborne"
        case .landed: return "checkmark.circle.fill"
        case .delayed: return "clock"
        case .canceled, .diverted: return "xmark.circle"
        }
    }

    private var statusColor: Color {
        switch flight.status {
        case .scheduled, .boarding: return .blue
        case .departed, .inAir: return .green
        case .landed: return .green
        case .delayed: return .orange
        case .canceled, .diverted: return .red
        }
    }

    private var statusText: String {
        flight.status.rawValue.replacingOccurrences(of: "_", with: " ").capitalized
    }

    private func formatTime(_ isoDate: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoDate) else { return isoDate }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "HH:mm"
        displayFormatter.timeZone = TimeZone.current
        return displayFormatter.string(from: date)
    }

    // MARK: - Actions
    private func toggleTracking() async {
        isTracking.toggle()
        // Implement tracking toggle
    }
}

// MARK: - Connection Risk View
struct ConnectionRiskView: View {
    let flightId: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Enter connecting flight number")
                    .font(.headline)

                TextField("Flight Number", text: .constant(""))
                    .textFieldStyle(.roundedBorder)
                    .padding()

                Button("Check Risk") {
                    // Implement risk check
                }
                .buttonStyle(.borderedProminent)

                Spacer()
            }
            .padding()
            .navigationTitle("Connection Risk")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview
#Preview {
    NavigationStack {
        FlightDetailView(flight: Flight(
            id: "AA_1234_2025-01-15",
            airlineCode: "AA",
            airlineName: "American Airlines",
            flightNumber: "1234",
            route: FlightRoute(
                origin: Airport(code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "US", terminal: "4", gate: "A12", latitude: 33.94, longitude: -118.41),
                destination: Airport(code: "JFK", name: "John F. Kennedy International", city: "New York", country: "US", terminal: "4", gate: "B24", latitude: 40.64, longitude: -73.78)
            ),
            times: FlightTimes(scheduledDeparture: "2025-01-15T10:00:00Z", scheduledArrival: "2025-01-15T18:00:00Z", estimatedDeparture: "2025-01-15T10:15:00Z", estimatedArrival: "2025-01-15T18:15:00Z", actualDeparture: nil, actualArrival: nil),
            status: .delayed,
            delayMinutes: 15,
            aircraft: AircraftInfo(type: "Boeing 737-800", registration: "N12345"),
            baggage: BaggageInfo(claim: "5"),
            lastUpdated: "2025-01-15T00:00:00Z"
        ))
    }
}
