//
//  ContentView.swift
//  AeroSense
//
//  Root view container - handles navigation based on auth state
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if appState.isLoggedIn {
                MainTabView()
            } else {
                AuthView()
            }
        }
        .overlay {
            if appState.isLoading {
                LoadingOverlay()
            }
        }
        .alert(item: $appState.appError) { error in
            Alert(
                title: Text(error.title),
                message: Text(error.message),
                dismissButton: .default(Text("OK"))
            )
        }
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    @State private var selectedTab: MainTab = .flights

    enum MainTab: String, CaseIterable {
        case flights = "Flights"
        case notifications = "Notifications"
        case settings = "Settings"

        var icon: String {
            switch self {
            case .flights: return "airplane"
            case .notifications: return "bell.badge"
            case .settings: return "gearshape"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            FlightListView()
                .tabItem {
                    Label(MainTab.flights.rawValue, systemImage: MainTab.flights.icon)
                }
                .tag(MainTab.flights)

            NotificationListView()
                .tabItem {
                    Label(MainTab.notifications.rawValue, systemImage: MainTab.notifications.icon)
                }
                .tag(MainTab.notifications)

            SettingsView()
                .tabItem {
                    Label(MainTab.settings.rawValue, systemImage: MainTab.settings.icon)
                }
                .tag(MainTab.settings)
        }
        .tint(Color.aerosense.accent)
    }
}

// MARK: - Auth View (Placeholder)

struct AuthView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "airplane")
                .font(.system(size: 60))
                .foregroundStyle(Color.aerosense.accent)

            Text("AeroSense")
                .font(.title)
                .fontWeight(.bold)

            Text("Never miss a gate change.\nNever worry about connections.")
                .multilineTextAlignment(.center)
                .foregroundColor(Color.aerosense.secondaryText)

            Button("Sign In") {
                // TODO: Implement sign in
            }
            .buttonStyle(.primary)

            Button("Create Account") {
                // TODO: Implement sign up
            }
            .buttonStyle(.secondary)
        }
        .padding()
    }
}

// MARK: - Flight List View (Placeholder)

struct FlightListView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "airplane.circle")
                    .font(.system(size: 80))
                    .foregroundStyle(Color.aerosense.tertiaryText)

                Text("No Flights Tracked")
                    .font(.title3)
                    .fontWeight(.semibold)

                Text("Add a flight to get started")
                    .foregroundColor(Color.aerosense.secondaryText)

                Button("Add Flight") {
                    // TODO: Present add flight sheet
                }
                .buttonStyle(.primary)
            }
            .navigationTitle("Flights")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        // TODO: Present add flight sheet
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
        }
    }
}

// MARK: - Notification List View (Placeholder)

struct NotificationListView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "bell")
                    .font(.system(size: 60))
                    .foregroundStyle(Color.aerosense.tertiaryText)

                Text("No Notifications")
                    .font(.title3)
                    .fontWeight(.semibold)

                Text("Alerts will appear here")
                    .foregroundColor(Color.aerosense.secondaryText)
            }
            .navigationTitle("Notifications")
        }
    }
}

// MARK: - Settings View (Placeholder)

struct SettingsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if let user = appState.currentUser {
                        HStack {
                            Image(systemName: "person.circle")
                                .font(.title2)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.name ?? "User")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text(user.email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }

                Section("Notifications") {
                    // TODO: Notification settings
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        appState.logout()
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

// MARK: - Loading Overlay

struct LoadingOverlay: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            ProgressView()
                .tint(Color.aerosense.accent)
                .scaleEffect(1.5)
        }
    }
}

// MARK: - Preview

#Preview("Logged Out") {
    ContentView()
        .environmentObject(AppState())
}

#Preview("Logged In") {
    ContentView()
        .environmentObject {
            let state = AppState()
            state.login(user: User(id: "1", email: "test@example.com", name: "Test User"))
            return state
        }
}
