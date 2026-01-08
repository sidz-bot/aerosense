package com.aerosense.app.ui.screens.flights

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.aerosense.app.data.MockFlightData
import com.aerosense.app.data.model.Flight
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * ViewModel for Flight List Screen
 * Manages flight list state and refresh operations
 */
class FlightListViewModel : ViewModel() {

    private val _flights = MutableLiveData<List<Flight>>()
    val flights: LiveData<List<Flight>> = _flights

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _isEmpty = MutableLiveData<Boolean>()
    val isEmpty: LiveData<Boolean> = _isEmpty

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    /**
     * Load all flights (today and upcoming)
     */
    suspend fun loadFlights() = withContext(Dispatchers.IO) {
        _isLoading.postValue(true)
        _error.postValue(null)

        try {
            // Simulate network delay
            delay(800)

            // Get mock flights
            val allFlights = MockFlightData.getMockFlights()

            // Post results
            _flights.postValue(allFlights)
            _isEmpty.postValue(allFlights.isEmpty())
            _isLoading.postValue(false)
        } catch (e: Exception) {
            _error.postValue("Failed to load flights: ${e.message}")
            _isLoading.postValue(false)
        }
    }

    /**
     * Refresh flights (pull-to-refresh)
     */
    suspend fun refreshFlights() = withContext(Dispatchers.IO) {
        _isLoading.postValue(true)
        _error.postValue(null)

        try {
            // Simulate network delay
            delay(1200)

            // Get mock flights (in real app, would fetch fresh data)
            val allFlights = MockFlightData.getMockFlights()

            _flights.postValue(allFlights)
            _isEmpty.postValue(allFlights.isEmpty())
            _isLoading.postValue(false)
        } catch (e: Exception) {
            _error.postValue("Failed to refresh flights: ${e.message}")
            _isLoading.postValue(false)
        }
    }

    /**
     * Get today's flights
     */
    fun getTodayFlights(): List<Flight> {
        return _flights.value?.filter { it.isToday } ?: emptyList()
    }

    /**
     * Get upcoming flights
     */
    fun getUpcomingFlights(): List<Flight> {
        return _flights.value?.filter { !it.isToday } ?: emptyList()
    }

    /**
     * Clear error
     */
    fun clearError() {
        _error.value = null
    }
}
