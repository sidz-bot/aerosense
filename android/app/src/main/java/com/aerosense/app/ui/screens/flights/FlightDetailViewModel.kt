package com.aerosense.app.ui.screens.flights

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.aerosense.app.data.MockFlightData
import com.aerosense.app.data.model.Flight
import com.aerosense.app.data.model.TimelineEvent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * ViewModel for Flight Detail Screen
 * Manages flight detail state and refresh operations
 */
class FlightDetailViewModel : ViewModel() {

    private val _flight = MutableLiveData<Flight?>()
    val flight: LiveData<Flight?> = _flight

    private val _timelineEvents = MutableLiveData<List<TimelineEvent>>()
    val timelineEvents: LiveData<List<TimelineEvent>> = _timelineEvents

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _isRefreshing = MutableLiveData<Boolean>()
    val isRefreshing: LiveData<Boolean> = _isRefreshing

    /**
     * Load flight details
     */
    suspend fun loadFlight(flightId: String) = withContext(Dispatchers.IO) {
        _isLoading.postValue(true)
        _error.postValue(null)

        try {
            // Simulate network delay
            delay(600)

            // Get mock flight
            val flight = MockFlightData.getFlightById(flightId)
            _flight.postValue(flight)
            _isLoading.postValue(false)

            // Load timeline events
            if (flight != null) {
                loadTimelineEvents(flightId)
            }
        } catch (e: Exception) {
            _error.postValue("Failed to load flight: ${e.message}")
            _isLoading.postValue(false)
        }
    }

    /**
     * Load timeline events for the flight
     */
    private fun loadTimelineEvents(flightId: String) {
        val events = MockFlightData.getTimelineEvents(flightId)
        _timelineEvents.postValue(events)
    }

    /**
     * Refresh flight data
     */
    suspend fun refreshFlight(flightId: String) = withContext(Dispatchers.IO) {
        _isRefreshing.postValue(true)
        _error.postValue(null)

        try {
            // Simulate network delay
            delay(1000)

            // Get mock flight (with potentially updated status)
            val flight = MockFlightData.getFlightById(flightId)
            _flight.postValue(flight)
            _isRefreshing.postValue(false)

            // Refresh timeline
            if (flight != null) {
                loadTimelineEvents(flightId)
            }
        } catch (e: Exception) {
            _error.postValue("Failed to refresh flight: ${e.message}")
            _isRefreshing.postValue(false)
        }
    }

    /**
     * Clear error
     */
    fun clearError() {
        _error.value = null
    }
}
