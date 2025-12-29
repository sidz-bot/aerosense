//
//  DesignSystem.swift
//  AeroSense
//
//  Design System - Colors, Typography, and Component Styles
//  Aligned with front-end-spec.md
//

import SwiftUI

// MARK: - Color System

extension Color {
    /// AeroSense design system colors
    enum aerosense {
        // Primary Colors
        static let primary = Color(red: 0x00, green: 0x66, blue: 0xCC) // #0066CC - Primary Blue
        static let accent = Color(red: 0x00, green: 0x66, blue: 0xCC) // #0066CC - Same as primary

        // Semantic Colors
        static let success = Color(red: 0x34, green: 0xC7, blue: 0x59) // #34C759 - Green
        static let warning = Color(red: 0xFF, green: 0x95, blue: 0x00) // #FF9500 - Orange
        static let critical = Color(red: 0xFF, green: 0x3B, blue: 0x30) // #FF3B30 - Red

        // Connection Risk Colors
        static let onTrack = Color(red: 0x34, green: 0xC7, blue: 0x59) // #34C759 - Green
        static let atRisk = Color(red: 0xFF, green: 0x95, blue: 0x00) // #FF9500 - Orange
        static let highRisk = Color(red: 0xFF, green: 0x3B, blue: 0x30) // #FF3B30 - Red-Orange
        static let criticalRisk = Color(red: 0xFF, green: 0x00, blue: 0x3B) // #FF003B - Deep Red

        // Background Colors
        static let background = Color(red: 0xF2, green: 0xF2, blue: 0xF7) // #F2F2F7 - System Gray 6
        static let cardBackground = Color.white
        static let secondaryBackground = Color(red: 0xE5, green: 0xE5, blue: 0xEA) // #E5E5EA - System Gray 5

        // Text Colors
        static let primaryText = Color(red: 0x00, green: 0x00, blue: 0x00) // #000000
        static let secondaryText = Color(red: 0x8E, green: 0x8E, blue: 0x93) // #8E8E93 - Secondary Label
        static let tertiaryText = Color(red: 0xC7, green: 0xC7, blue: 0xCC) // #C7C7CC - Tertiary Label

        // Border Colors
        static let separator = Color(red: 0xC6, green: 0xC6, blue: 0xC8) // #C6C6C8 - Separator
        static let border = Color(red: 0xE5, green: 0xE5, blue: 0xEA) // #E5E5EA

        // Overlay Colors
        static let overlay = Color.black.opacity(0.3)
        static let toast = Color(red: 0x3C, green: 0x3C, blue: 0x43) // #3C3C43 - System Gray
    }

    // Initialize from hex
    init(red: Int, green: Int, blue: Int) {
        self.init(
            .sRGB,
            red: Double(red) / 255,
            green: Double(green) / 255,
            blue: Double(blue) / 255,
            opacity: 1
        )
    }
}

// MARK: - Typography

extension Font {
    enum aerosense {
        // Large Title
        static let largeTitle = Font.system(size: 34, weight: .bold)
        static let largeTitle2 = Font.system(size: 28, weight: .bold)

        // Title
        static let title = Font.system(size: 22, weight: .bold)
        static let title2 = Font.system(size: 20, weight: .semibold)
        static let title3 = Font.system(size: 17, weight: .semibold)

        // Body
        static let body = Font.system(size: 17, weight: .regular)
        static let bodyEmphasized = Font.system(size: 17, weight: .semibold)

        // Callout
        static let callout = Font.system(size: 16, weight: .regular)

        // Subheadline
        static let subheadline = Font.system(size: 15, weight: .regular)
        static let subheadlineSemibold = Font.system(size: 15, weight: .semibold)

        // Footnote
        static let footnote = Font.system(size: 13, weight: .regular)
        static let footnoteSemibold = Font.system(size: 13, weight: .semibold)

        // Caption
        static let caption = Font.system(size: 12, weight: .regular)
        static let captionSemibold = Font.system(size: 12, weight: .semibold)
    }
}

// MARK: - Spacing

extension CGFloat {
    enum spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
    }
}

// MARK: - Corner Radius

extension CGFloat {
    enum radius {
        static let sm: CGFloat = 6
        static let md: CGFloat = 10
        static let lg: CGFloat = 14
        static let xl: CGFloat = 20
        static let round: CGFloat = 999 // Fully rounded
    }
}

// MARK: - Button Styles

struct ButtonStyles {
    /// Primary button style - Filled blue background
    struct Primary: ButtonStyle {
        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .font(Font.aerosense.bodyEmphasized)
                .foregroundColor(.white)
                .padding(.horizontal, .spacing.lg)
                .padding(.vertical, .spacing.md)
                .frame(maxWidth: .infinity)
                .background(Color.aerosense.primary)
                .cornerRadius(.radius.md)
                .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
                .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
        }
    }

    /// Secondary button style - outlined
    struct Secondary: ButtonStyle {
        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .font(Font.aerosense.bodyEmphasized)
                .foregroundColor(Color.aerosense.primary)
                .padding(.horizontal, .spacing.lg)
                .padding(.vertical, .spacing.md)
                .frame(maxWidth: .infinity)
                .background(Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: .radius.md)
                        .stroke(Color.aerosense.primary, lineWidth: 1.5)
                )
                .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
                .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
        }
    }

    /// Destructive button style - Red
    struct Destructive: ButtonStyle {
        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .font(Font.aerosense.bodyEmphasized)
                .foregroundColor(.white)
                .padding(.horizontal, .spacing.lg)
                .padding(.vertical, .spacing.md)
                .background(Color.aerosense.critical)
                .cornerRadius(.radius.md)
                .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
                .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
        }
    }

    /// Icon-only button style
    struct Icon: ButtonStyle {
        let size: CGFloat

        init(size: CGFloat = 44) {
            self.size = size
        }

        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .frame(width: size, height: size)
                .background(Color.aerosense.secondaryBackground)
                .cornerRadius(.radius.md)
                .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
                .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
        }
    }
}

// MARK: - Convenience Extensions

extension Button {
    func primaryStyle() -> some View {
        self.buttonStyle(ButtonStyles.Primary())
    }

    func secondaryStyle() -> some View {
        self.buttonStyle(ButtonStyles.Secondary())
    }

    func destructiveStyle() -> some View {
        self.buttonStyle(ButtonStyles.Destructive())
    }

    func iconStyle(size: CGFloat = 44) -> some View {
        self.buttonStyle(ButtonStyles.Icon(size: size))
    }
}

// MARK: - Card View Modifier

struct CardModifier: ViewModifier {
    let padding: CGFloat

    init(padding: CGFloat = .spacing.lg) {
        self.padding = padding
    }

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.aerosense.cardBackground)
            .cornerRadius(.radius.lg)
            .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

extension View {
    func cardStyle(padding: CGFloat = .spacing.lg) -> some View {
        self.modifier(CardModifier(padding: padding))
    }
}

// MARK: - Status Indicator

struct StatusIndicator: View {
    enum Status {
        case onTrack
        case atRisk
        case highRisk
        case critical
        case unknown

        var color: Color {
            switch self {
            case .onTrack: return .aerosense.onTrack
            case .atRisk: return .aerosense.atRisk
            case .highRisk: return .aerosense.highRisk
            case .critical: return .aerosense.criticalRisk
            case .unknown: return .aerosense.secondaryText
            }
        }

        var icon: String {
            switch self {
            case .onTrack: return "checkmark.circle.fill"
            case .atRisk: return "exclamationmark.triangle.fill"
            case .highRisk: return "exclamationmark.octagon.fill"
            case .critical: return "xmark.octagon.fill"
            case .unknown: return "questionmark.circle"
            }
        }
    }

    let status: Status
    let size: CGFloat

    init(status: Status, size: CGFloat = 16) {
        self.status = status
        self.size = size
    }

    var body: some View {
        Image(systemName: status.icon)
            .font(.system(size: size))
            .foregroundColor(status.color)
    }
}

// MARK: - Flight Status Badge

struct FlightStatusBadge: View {
    let status: Flight.Status
    let delayMinutes: Int?

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: iconName)
                .font(.system(size: 10))
            Text(statusText)
                .font(Font.aerosense.footnoteSemibold)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(statusColor.opacity(0.15))
        .foregroundColor(statusColor)
        .cornerRadius(.radius.round)
    }

    private var statusColor: Color {
        switch status {
        case .onTime, .landed:
            return .aerosense.success
        case .delayed:
            return .aerosense.warning
        case .canceled:
            return .aerosense.critical
        case .boarding:
            return .aerosense.primary
        case .inAir:
            return .aerosense.primary
        case .scheduled:
            return .aerosense.secondaryText
        }
    }

    private var iconName: String {
        switch status {
        case .onTime, .scheduled: return "clock"
        case .delayed: return "exclamationmark.circle"
        case .canceled: return "xmark.circle"
        case .boarding: return "figure.walk"
        case .inAir: return "airborne"
        case .landed: return "checkmark.circle"
        }
    }

    private var statusText: String {
        switch status {
        case .onTime: return "On Time"
        case .delayed:
            if let delay = delayMinutes {
                return "Delayed \(delay)m"
            }
            return "Delayed"
        case .canceled: return "Canceled"
        case .boarding: return "Boarding"
        case .inAir: return "In Air"
        case .landed: return "Landed"
        case .scheduled: return "Scheduled"
        }
    }
}

// MARK: - Preview

#Preview("Design System") {
    ScrollView {
        VStack(spacing: 20) {
            // Colors
            VStack(alignment: .leading, spacing: 8) {
                Text("Colors").font(.title3)
                HStack {
                    Circle().fill(Color.aerosense.primary).frame(width: 40, height: 40)
                    Circle().fill(Color.aerosense.success).frame(width: 40, height: 40)
                    Circle().fill(Color.aerosense.warning).frame(width: 40, height: 40)
                    Circle().fill(Color.aerosense.critical).frame(width: 40, height: 40)
                }
            }

            // Buttons
            VStack(alignment: .leading, spacing: 8) {
                Text("Buttons").font(.title3)
                Button("Primary Action") {}.primaryStyle()
                Button("Secondary Action") {}.secondaryStyle()
                Button("Destructive") {}.destructiveStyle()
            }

            // Status Indicators
            VStack(alignment: .leading, spacing: 8) {
                Text("Status Indicators").font(.title3)
                HStack {
                    StatusIndicator(status: .onTrack)
                    StatusIndicator(status: .atRisk)
                    StatusIndicator(status: .highRisk)
                    StatusIndicator(status: .critical)
                }
            }

            // Flight Status Badges
            VStack(alignment: .leading, spacing: 8) {
                Text("Flight Status").font(.title3)
                VStack(alignment: .leading, spacing: 8) {
                    FlightStatusBadge(status: .onTime, delayMinutes: nil)
                    FlightStatusBadge(status: .delayed, delayMinutes: 45)
                    FlightStatusBadge(status: .boarding, delayMinutes: nil)
                    FlightStatusBadge(status: .inAir, delayMinutes: nil)
                }
            }
        }
        .padding()
    }
    .background(Color.aerosense.background)
}
