//
//  NotificationsView.swift
//  AeroSense
//
//  Flight notifications screen
//

import SwiftUI

struct NotificationItem: Identifiable {
    let id = UUID()
    let flightNumber: String
    let type: NotificationType
    let message: String
    let time: Date
    let isRead: Bool

    enum NotificationType {
        case gateChange
        case delay
        case boarding
        case connectionRisk
        case canceled

        var icon: String {
            switch self {
            case .gateChange: return "door.left.right.open"
            case .delay: return "clock"
            case .boarding: return "figure.walk"
            case .connectionRisk: return "exclamationmark.triangle"
            case .canceled: return "xmark.circle"
            }
        }

        var color: Color {
            switch self {
            case .gateChange: return .blue
            case .delay: return .orange
            case .boarding: return .green
            case .connectionRisk: return .red
            case .canceled: return .red
            }
        }
    }
}

struct NotificationsView: View {
    @State private var notifications: [NotificationItem] = [
        NotificationItem(
            flightNumber: "AA 1234",
            type: .gateChange,
            message: "Gate changed from A12 to B24",
            time: Date().addingTimeInterval(-300),
            isRead: false
        ),
        NotificationItem(
            flightNumber: "AA 1234",
            type: .delay,
            message: "Flight delayed by 15 minutes",
            time: Date().addingTimeInterval(-600),
            isRead: true
        ),
        NotificationItem(
            flightNumber: "UA 567",
            type: .boarding,
            message: "Boarding now starting",
            time: Date().addingTimeInterval(-1800),
            isRead: true
        ),
        NotificationItem(
            flightNumber: "DL 890",
            type: .connectionRisk,
            message: "Connection risk: High risk (25 min buffer)",
            time: Date().addingTimeInterval(-3600),
            isRead: true
        ),
    ]

    var body: some View {
        List {
            ForEach(notifications) { notification in
                NotificationRow(notification: notification)
                    .listRowBackground(notification.isRead ? Color.clear : Color.blue.opacity(0.05))
            }
            .onDelete(perform: deleteNotifications)
        }
        .navigationTitle("Notifications")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Mark All Read") {
                    markAllAsRead()
                }
                .font(.subheadline)
            }
        }
    }

    private func deleteNotifications(at offsets: IndexSet) {
        notifications.remove(atOffsets: offsets)
    }

    private func markAllAsRead() {
        for index in notifications.indices {
            notifications[index] = NotificationItem(
                flightNumber: notifications[index].flightNumber,
                type: notifications[index].type,
                message: notifications[index].message,
                time: notifications[index].time,
                isRead: true
            )
        }
    }
}

struct NotificationRow: View {
    let notification: NotificationItem

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill(notification.type.color.opacity(0.15))
                    .frame(width: 40, height: 40)

                Image(systemName: notification.type.icon)
                    .foregroundColor(notification.type.color)
            }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(notification.flightNumber)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)

                Text(notification.message)
                    .font(.subheadline)
            }

            Spacer()

            // Time
            VStack(alignment: .trailing, spacing: 4) {
                Text(notification.time, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)

                if !notification.isRead {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 8, height: 8)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Preview
#Preview {
    NavigationStack {
        NotificationsView()
    }
}
