//
//  AeroSenseApp.swift
//  AeroSense
//
//  Main App Entry Point
//  Aligned with Architecture.md - MVVM + SwiftUI
//

import SwiftUI

@main
struct AeroSenseApp: App {
    // MARK: - Properties

    @StateObject private var appState = AppState()

    // MARK: - Body

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .onAppear {
                    setupAppearance()
                }
        }
    }

    // MARK: - Setup

    private func setupAppearance() {
        // Configure navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.aerosense.background)

        // Large title appearance
        appearance.largeTitleTextAttributes = [
            .foregroundColor: UIColor(Color.aerosense.primaryText),
            .font: UIFont.systemFont(ofSize: 28, weight: .bold)
        ]

        // Regular title appearance
        appearance.titleTextAttributes = [
            .foregroundColor: UIColor(Color.aerosense.primaryText),
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold)
        ]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance

        // Tab bar appearance
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = UIColor(Color.aerosense.background)
        tabBarAppearance.shadowColor = UIColor(Color.aerosense.separator)

        // Normal tab item
        tabBarAppearance.stackedLayoutAppearance.normal.iconColor = UIColor(Color.aerosense.secondaryText)
        tabBarAppearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor(Color.aerosense.secondaryText),
            .font: UIFont.systemFont(ofSize: 11, weight: .medium)
        ]

        // Selected tab item
        tabBarAppearance.stackedLayoutAppearance.selected.iconColor = UIColor(Color.aerosense.accent)
        tabBarAppearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: UIColor(Color.aerosense.accent),
            .font: UIFont.systemFont(ofSize: 11, weight: .semibold)
        ]

        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
    }
}

// MARK: - App State

/// Global application state
@MainActor
class AppState: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var currentUser: User?
    @Published var isLoading: Bool = false
    @Published var appError: AppError?

    // MARK: - Initialization

    init() {
        loadUserSession()
    }

    // MARK: - Session Management

    private func loadUserSession() {
        // TODO: Load from Keychain
        isLoggedIn = false
    }

    func login(user: User) {
        currentUser = user
        isLoggedIn = true
        // TODO: Save to Keychain
    }

    func logout() {
        currentUser = nil
        isLoggedIn = false
        // TODO: Clear Keychain
    }
}

// MARK: - Models

struct User: Codable {
    let id: String
    let email: String
    var name: String?
    var avatar: URL?
}

struct AppError: Error {
    let title: String
    let message: String
    let code: String?
}
