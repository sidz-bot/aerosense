package com.aerosense.app.data.model

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Flight Status Enum
 */
enum class FlightStatus(val displayName: String, val colorRes: Int) {
    SCHEDULED("Scheduled", com.aerosense.app.R.color.status_scheduled),
    ON_TIME("On Time", com.aerosense.app.R.color.status_on_time),
    DELAYED("Delayed", com.aerosense.app.R.color.status_delayed),
    CANCELED("Canceled", com.aerosense.app.R.color.status_canceled),
    BOARDING("Boarding", com.aerosense.app.R.color.status_boarding),
    IN_AIR("In Air", com.aerosense.app.R.color.status_in_air),
    LANDED("Landed", com.aerosense.app.R.color.status_landed);

    companion object {
        fun fromString(value: String): FlightStatus {
            return values().find { it.name.equals(value, ignoreCase = true) } ?: SCHEDULED
        }
    }
}

/**
 * Connection Risk Enum
 */
enum class ConnectionRisk(val displayName: String, val colorRes: Int) {
    ON_TRACK("On Track", com.aerosense.app.R.color.risk_on_track),
    AT_RISK("At Risk", com.aerosense.app.R.color.risk_at_risk),
    HIGH_RISK("High Risk", com.aerosense.app.R.color.risk_high_risk),
    CRITICAL("Critical", com.aerosense.app.R.color.risk_critical)
}

/**
 * Flight Data Model
 */
data class Flight(
    val id: String,
    val airlineCode: String,
    val flightNumber: String,
    val departureAirport: Airport,
    val arrivalAirport: Airport,
    val departureTime: Date,
    val arrivalTime: Date,
    val gate: String,
    val terminal: String? = null,
    val status: FlightStatus,
    val delayMinutes: Int = 0,
    val aircraft: String? = null,
    val isToday: Boolean = false,
    val hasConnection: Boolean = false,
    val connectionFlight: Flight? = null,
    val connectionRisk: ConnectionRisk? = null
) {
    val flightCode: String get() = "$airlineCode$flightNumber"
    val route: String get() = "${departureAirport.code} → ${arrivalAirport.code}"
    val fullRoute: String get() = "${departureAirport.city} → ${arrivalAirport.city}"

    fun getDelayText(): String {
        return if (delayMinutes > 0) "Delayed ${delayMinutes}m" else status.displayName
    }
}

/**
 * Airport Data Model
 */
data class Airport(
    val code: String,
    val city: String,
    val name: String,
    val terminal: String? = null
)

/**
 * Flight Segment (for multi-leg journeys)
 */
data class FlightSegment(
    val flight: Flight,
    val segmentNumber: Int,
    val totalSegments: Int
)

/**
 * Flight Timeline Event
 */
data class TimelineEvent(
    val id: String,
    val time: Date,
    val title: String,
    val description: String? = null,
    val status: EventStatus,
    val gate: String? = null
)

enum class EventStatus {
    COMPLETED,
    CURRENT,
    UPCOMING,
    CANCELED
}
