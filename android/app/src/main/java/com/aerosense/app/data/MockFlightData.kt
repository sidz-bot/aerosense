package com.aerosense.app.data

import com.aerosense.app.data.model.Airport
import com.aerosense.app.data.model.ConnectionRisk
import com.aerosense.app.data.model.Flight
import com.aerosense.app.data.model.FlightStatus
import com.aerosense.app.data.model.TimelineEvent
import com.aerosense.app.data.model.EventStatus
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Mock Flight Data Provider
 * Provides static/mock data for UI development
 * TODO: Replace with actual API calls in future stories
 */
object MockFlightData {

    private val dateFormat = SimpleDateFormat("h:mm a", Locale.US)
    private val fullDateFormat = SimpleDateFormat("MMM d, h:mm a", Locale.US)

    /**
     * Get mock flights for the list screen
     */
    fun getMockFlights(): List<Flight> {
        val now = Calendar.getInstance()

        // Today's flights
        val flight1 = createFlight(
            id = "flight_001",
            airlineCode = "AA",
            flightNumber = "1234",
            departureAirport = Airport("SFO", "San Francisco", "San Francisco International"),
            arrivalAirport = Airport("JFK", "New York", "John F. Kennedy International"),
            departureTime = createTimestamp(now, 8, 30),
            arrivalTime = createTimestamp(now, 17, 45),
            gate = "B22",
            terminal = "2",
            status = FlightStatus.ON_TIME,
            isToday = true,
            hasConnection = true,
            connectionFlight = createConnectionFlight(
                now, "AA", "1890", "ORD", "JFK", 12, 15, 15, 55, "F12", "2"
            ),
            connectionRisk = ConnectionRisk.ON_TRACK
        )

        val flight2 = createFlight(
            id = "flight_002",
            airlineCode = "UA",
            flightNumber = "452",
            departureAirport = Airport("JFK", "New York", "John F. Kennedy International"),
            arrivalAirport = Airport("SFO", "San Francisco", "San Francisco International"),
            departureTime = createTimestamp(now, 17, 30),
            arrivalTime = createTimestamp(now.add(Calendar.DAY_OF_MONTH, 1), 20, 15),
            gate = "A12",
            terminal = "1",
            status = FlightStatus.DELAYED,
            delayMinutes = 45,
            isToday = true,
            hasConnection = false
        )

        // Upcoming flights
        val flight3 = createFlight(
            id = "flight_003",
            airlineCode = "DL",
            flightNumber = "893",
            departureAirport = Airport("SFO", "San Francisco", "San Francisco International"),
            arrivalAirport = Airport("ATL", "Atlanta", "Hartsfield-Jackson Atlanta"),
            departureTime = createTimestamp(now.add(Calendar.DAY_OF_MONTH, 7), 11, 20),
            arrivalTime = createTimestamp(now.add(Calendar.DAY_OF_MONTH, 7), 17, 30),
            gate = "C15",
            terminal = "3",
            status = FlightStatus.SCHEDULED,
            isToday = false,
            hasConnection = false
        )

        val flight4 = createFlight(
            id = "flight_004",
            airlineCode = "WN",
            flightNumber = "1843",
            departureAirport = Airport("LAX", "Los Angeles", "Los Angeles International"),
            arrivalAirport = Airport("SFO", "San Francisco", "San Francisco International"),
            departureTime = createTimestamp(now.add(Calendar.DAY_OF_MONTH, 15), 14, 15),
            arrivalTime = createTimestamp(now.add(Calendar.DAY_OF_MONTH, 15), 15, 30),
            gate = "B5",
            terminal = "1",
            status = FlightStatus.SCHEDULED,
            isToday = false,
            hasConnection = false
        )

        val flight5 = createFlight(
            id = "flight_005",
            airlineCode = "B6",
            flightNumber = "1924",
            departureAirport = Airport("SFO", "San Francisco", "San Francisco International"),
            arrivalAirport = Airport("BOS", "Boston", "Boston Logan"),
            departureTime = createTimestamp(now.add(Calendar.DAY_OF_MONTH, 28), 9, 0),
            arrivalTime = createTimestamp(now.add(Calendar.DAY_OF_MONTH, 28), 17, 30),
            gate = "A22",
            terminal = "1",
            status = FlightStatus.SCHEDULED,
            isToday = false,
            hasConnection = false
        )

        return listOf(flight1, flight2, flight3, flight4, flight5)
    }

    /**
     * Get mock flight by ID
     */
    fun getFlightById(flightId: String): Flight? {
        return getMockFlights().find { it.id == flightId }
    }

    /**
     * Get mock timeline events for a flight
     */
    fun getTimelineEvents(flightId: String): List<TimelineEvent> {
        val now = Calendar.getInstance()
        val flight = getFlightById(flightId) ?: return emptyList()

        val events = mutableListOf<TimelineEvent>()

        // Check-in opens
        events.add(TimelineEvent(
            id = "${flightId}_checkin",
            time = createTimestamp(now, 6, 0),
            title = "Check-in opens",
            description = "Online and mobile check-in available",
            status = EventStatus.COMPLETED
        ))

        // Boarding
        events.add(TimelineEvent(
            id = "${flightId}_boarding",
            time = createTimestamp(now, 8, 0),
            title = "Boarding begins",
            description = "Gate ${flight.gate}",
            status = if (flight.status == FlightStatus.BOARDING || flight.status == FlightStatus.IN_AIR) {
                EventStatus.COMPLETED
            } else {
                EventStatus.UPCOMING
            }
        ))

        // Departure
        events.add(TimelineEvent(
            id = "${flightId}_departure",
            time = flight.departureTime,
            title = "Departure",
            description = "On time",
            status = if (flight.status == FlightStatus.IN_AIR || flight.status == FlightStatus.LANDED) {
                EventStatus.COMPLETED
            } else if (flight.status == FlightStatus.BOARDING) {
                EventStatus.CURRENT
            } else {
                EventStatus.UPCOMING
            }
        ))

        // Arrival (if connection exists, show arrival at connection airport)
        if (flight.hasConnection && flight.connectionFlight != null) {
            events.add(TimelineEvent(
                id = "${flightId}_arrival",
                time = flight.arrivalTime,
                title = "Arrive ${flight.arrivalAirport.city}",
                description = "Gate ${flight.connectionFlight?.gate ?: "TBD"}",
                status = if (flight.status == FlightStatus.LANDED) {
                    EventStatus.COMPLETED
                } else {
                    EventStatus.UPCOMING
                }
            ))

            // Connection
            val connectionTime = flight.connectionFlight?.departureTime
            events.add(TimelineEvent(
                id = "${flightId}_connection",
                time = connectionTime ?: flight.arrivalTime,
                title = "Connection",
                description = "55 min layover • Gate ${flight.connectionFlight?.gate ?: "TBD"}",
                status = EventStatus.UPCOMING
            ))

            // Second departure
            events.add(TimelineEvent(
                id = "${flightId}_second_departure",
                time = connectionTime ?: flight.arrivalTime,
                title = "Depart ${flight.connectionFlight?.departureAirport?.city ?: ""}",
                description = "On time",
                status = EventStatus.UPCOMING
            ))

            // Final arrival
            events.add(TimelineEvent(
                id = "${flightId}_final_arrival",
                time = flight.connectionFlight?.arrivalTime ?: flight.arrivalTime,
                title = "Arrive ${flight.connectionFlight?.arrivalAirport?.city ?: ""}",
                description = "Baggage at Carousel 5",
                status = EventStatus.UPCOMING
            ))
        } else {
            // Direct flight arrival
            events.add(TimelineEvent(
                id = "${flightId}_arrival",
                time = flight.arrivalTime,
                title = "Arrive ${flight.arrivalAirport.city}",
                description = "Baggage at Carousel ${((flight.id.hashCode() % 10) + 1)}",
                status = EventStatus.UPCOMING
            ))
        }

        return events
    }

    /**
     * Create a flight instance
     */
    private fun createFlight(
        id: String,
        airlineCode: String,
        flightNumber: String,
        departureAirport: Airport,
        arrivalAirport: Airport,
        departureTime: Date,
        arrivalTime: Date,
        gate: String,
        terminal: String?,
        status: FlightStatus,
        delayMinutes: Int = 0,
        aircraft: String? = null,
        isToday: Boolean = false,
        hasConnection: Boolean = false,
        connectionFlight: Flight? = null,
        connectionRisk: ConnectionRisk? = null
    ): Flight {
        return Flight(
            id = id,
            airlineCode = airlineCode,
            flightNumber = flightNumber,
            departureAirport = departureAirport,
            arrivalAirport = arrivalAirport,
            departureTime = departureTime,
            arrivalTime = arrivalTime,
            gate = gate,
            terminal = terminal,
            status = status,
            delayMinutes = delayMinutes,
            aircraft = aircraft,
            isToday = isToday,
            hasConnection = hasConnection,
            connectionFlight = connectionFlight,
            connectionRisk = connectionRisk
        )
    }

    /**
     * Create a connection flight
     */
    private fun createConnectionFlight(
        baseTime: Calendar,
        airlineCode: String,
        flightNumber: String,
        depCode: String,
        arrCode: String,
        depHour: Int,
        depMin: Int,
        arrHour: Int,
        arrMin: Int,
        gate: String,
        terminal: String
    ): Flight {
        return createFlight(
            id = "connection_${System.currentTimeMillis()}",
            airlineCode = airlineCode,
            flightNumber = flightNumber,
            departureAirport = Airport(depCode, getCityName(depCode), "Airport"),
            arrivalAirport = Airport(arrCode, getCityName(arrCode), "Airport"),
            departureTime = createTimestamp(baseTime, depHour, depMin),
            arrivalTime = createTimestamp(baseTime, arrHour, arrMin),
            gate = gate,
            terminal = terminal,
            status = FlightStatus.SCHEDULED,
            isToday = true,
            hasConnection = false
        )
    }

    /**
     * Create a timestamp for a specific time today
     */
    private fun createTimestamp(baseTime: Calendar, hour: Int, minute: Int): Date {
        val cal = baseTime.clone() as Calendar
        cal.set(Calendar.HOUR_OF_DAY, hour)
        cal.set(Calendar.MINUTE, minute)
        cal.set(Calendar.SECOND, 0)
        return cal.time
    }

    /**
     * Get city name from airport code
     */
    private fun getCityName(code: String): String {
        val cities = mapOf(
            "SFO" to "San Francisco",
            "JFK" to "New York",
            "ORD" to "Chicago",
            "ATL" to "Atlanta",
            "LAX" to "Los Angeles",
            "BOS" to "Boston",
            "MIA" to "Miami",
            "DEN" to "Denver",
            "SEA" to "Seattle",
            "DFW" to "Dallas"
        )
        return cities[code] ?: code
    }

    /**
     * Format time for display
     */
    fun formatTime(date: Date): String {
        return dateFormat.format(date)
    }

    /**
     * Format full date for display
     */
    fun formatFullDate(date: Date): String {
        return fullDateFormat.format(date)
    }
}
