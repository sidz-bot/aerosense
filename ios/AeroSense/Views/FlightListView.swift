//
//  FlightListView.swift
//  AeroSense
//
//  Flight list screen with search functionality
//

import SwiftUI

struct FlightListView: View {
    @StateObject private var viewModel = FlightListViewModel()
    @State private var selectedFlight: Flight?

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                if viewModel.isLoading && viewModel.flights.isEmpty {
                    loadingView
                } else if viewModel.flights.isEmpty && !viewModel.isLoading {
                    emptyStateView
                } else {
                    flightList
                }
            }
            .navigationTitle("Flights")
            .searchable(text: $viewModel.searchQuery, prompt: "Search flights...")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Menu {
                        Button("By Flight Number", systemImage: "number") {
                            viewModel.searchType = .byNumber
                        }
                        Button("By Route", systemImage: "airplane") {
                            viewModel.searchType = .byRoute
                        }
                    } label: {
                        Label("Search", systemImage: "ellipsis.circle")
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    DatePicker("", selection: $viewModel.selectedDate, displayedComponents: .date)
                        .labelsHidden()
                }
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                if let error = viewModel.errorMessage {
                    Text(error)
                }
            }
        }
        .task {
            await viewModel.loadTrackedFlights()
        }
    }

    // MARK: - Flight List
    private var flightList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(viewModel.flights) { flight in
                    FlightCard(flight: flight, viewModel: viewModel)
                        .onTapGesture {
                            selectedFlight = flight
                        }
                }
            }
            .padding()
        }
        .sheet(item: $selectedFlight) { flight in
            NavigationStack {
                FlightDetailView(flight: flight)
            }
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Loading flights...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }

    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "airplane")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("No Flights Found")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Search for flights by number or route")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button("Search Flights") {
                Task {
                    await viewModel.searchFlights()
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(40)
    }
}

// MARK: - Flight Card
struct FlightCard: View {
    let flight: Flight
    let viewModel: FlightListViewModel

    @State private var isTracking = false

    var body: some View {
        VStack(spacing: 0) {
            // Airline info
            HStack {
                Image(systemName: "airplane.departure")
                    .foregroundColor(.blue)
                Text(flight.airlineName)
                    .font(.headline)
                Spacer()
                FlightStatusBadge(status: flight.status)
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)

            Divider()
                .padding(.vertical, 8)

            // Route
            HStack(spacing: 12) {
                // Origin
                VStack(alignment: .leading, spacing: 4) {
                    Text(flight.route.origin.code)
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                    Text(flight.route.origin.city)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Flight path visualization
                VStack(spacing: 4) {
                    Text(flight.flightNumber)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)

                    HStack(spacing: 4) {
                        Circle()
                            .fill(.blue)
                            .frame(width: 6, height: 6)
                        Line()
                            .stroke(style: StrokeStyle(lineWidth: 1, dash: [2]))
                            .frame(width: 40)
                        Circle()
                            .fill(.green)
                            .frame(width: 6, height: 6)
                    }

                    if let delay = flight.delayMinutes, delay > 0 {
                        Text("\(delay)m delay")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }

                Spacer()

                // Destination
                VStack(alignment: .trailing, spacing: 4) {
                    Text(flight.route.destination.code)
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                    Text(flight.route.destination.city)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)

            // Times
            HStack {
                if let depTime = viewModel.formattedTime(flight.times.scheduledDeparture) {
                    Label(depTime, systemImage: "departure")
                        .font(.caption)
                }

                Spacer()

                if let arrTime = viewModel.formattedTime(flight.times.scheduledArrival) {
                    Label(arrTime, systemImage: "arrival")
                        .font(.caption)
                }
            }
            .foregroundColor(.secondary)
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
        }
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Line Shape
struct Line: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.width, y: rect.midY))
        return path
    }
}

// MARK: - Preview
#Preview {
    FlightListView()
}
