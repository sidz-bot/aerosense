package com.aerosense.app.ui.screens.flights

import android.os.Bundle
import android.view.View
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import com.aerosense.app.R
import com.aerosense.app.data.MockFlightData
import com.aerosense.app.ui.BaseFragment
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.coroutines.launch

/**
 * Flight Detail Screen
 * Shows complete flight information with connection status
 */
class FlightDetailFragment : BaseFragment() {

    private val args: FlightDetailFragmentArgs by navArgs()
    private val viewModel: FlightDetailViewModel by viewModels()

    private lateinit var connectionStatusCard: View
    private lateinit var connectionStatusText: android.widget.TextView
    private lateinit var connectionMessage: android.widget.TextView
    private lateinit var updatedTimeText: android.widget.TextView
    private lateinit var rvFlightSegments: androidx.recyclerview.widget.RecyclerView
    private lateinit var cardConnectionDetail: View
    private lateinit var btnViewTimeline: View
    private lateinit var fabTrackLive: FloatingActionButton

    override fun getLayoutRes(): Int = R.layout.fragment_flight_detail

    override fun setupView(view: View) {
        // Initialize views
        connectionStatusCard = view.findViewById(R.id.cardConnectionStatus)
        connectionStatusText = view.findViewById(R.id.tvConnectionStatus)
        connectionMessage = view.findViewById(R.id.tvConnectionMessage)
        updatedTimeText = view.findViewById(R.id.tvUpdatedTime)
        rvFlightSegments = view.findViewById(R.id.rvFlightSegments)
        cardConnectionDetail = view.findViewById(R.id.cardConnectionDetail)
        btnViewTimeline = view.findViewById(R.id.btnViewTimeline)
        fabTrackLive = view.findViewById(R.id.fabTrackLive)

        // Setup flight segments list
        setupFlightSegmentsList()

        // Connection detail card click
        cardConnectionDetail.setOnClickListener {
            navigateToConnectionRisk()
        }

        // Timeline button
        btnViewTimeline.setOnClickListener {
            navigateToTimeline()
        }

        // Track Live FAB
        fabTrackLive.setOnClickListener {
            showTrackLiveNotImplemented()
        }

        // Load flight data
        lifecycleScope.launch {
            viewModel.loadFlight(args.flightId)
        }
    }

    override fun observeData() {
        // Observe flight data
        viewModel.flight.observe(viewLifecycleOwner) { flight ->
            flight?.let { updateUI(it) }
        }

        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            // Could show loading indicator if needed
        }

        // Observe errors
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                showError(it)
                viewModel.clearError()
            }
        }

        // Observe refresh state
        viewModel.isRefreshing.observe(viewLifecycleOwner) { isRefreshing ->
            // Update refresh indicator
        }
    }

    private fun setupFlightSegmentsList() {
        // Simple adapter for flight segments
        // TODO: Create proper adapter in future story
        rvFlightSegments.layoutManager = LinearLayoutManager(requireContext())
    }

    private fun updateUI(flight: com.aerosense.app.data.model.Flight) {
        // Update toolbar title
        activity?.title = flight.flightCode

        // Update connection status
        val statusUI = when (flight.connectionRisk) {
            com.aerosense.app.data.model.ConnectionRisk.ON_TRACK -> {
                ConnectionStatusUI(
                    backgroundColor = R.color.success_light,
                    textColor = R.color.success,
                    textRes = R.string.connection_on_track,
                    message = "Your connection is on schedule. Relax, you have time."
                )
            }
            com.aerosense.app.data.model.ConnectionRisk.AT_RISK -> {
                ConnectionStatusUI(
                    backgroundColor = R.color.warning_light,
                    textColor = R.color.warning,
                    textRes = R.string.connection_at_risk,
                    message = "Your connection is tight. First flight delay could cause you to miss your connecting flight."
                )
            }
            com.aerosense.app.data.model.ConnectionRisk.HIGH_RISK -> {
                ConnectionStatusUI(
                    backgroundColor = R.color.error_light,
                    textColor = R.color.error,
                    textRes = R.string.connection_critical,
                    message = "Your connection is at risk. You need to hurry to make your connection."
                )
            }
            com.aerosense.app.data.model.ConnectionRisk.CRITICAL -> {
                ConnectionStatusUI(
                    backgroundColor = R.color.error_light,
                    textColor = R.color.error,
                    textRes = R.string.connection_critical,
                    message = "Your connection is critical! You will likely miss this connection."
                )
            }
            else -> {
                ConnectionStatusUI(
                    backgroundColor = R.color.gray_100,
                    textColor = R.color.gray_700,
                    textRes = R.string.connection_on_track,
                    message = "Connection status unknown"
                )
            }
        }

        connectionStatusCard.apply {
            setBackgroundResource(statusUI.backgroundColor)
            connectionStatusText.text = getString(statusUI.textRes)
            connectionStatusText.setTextColor(getColor(statusUI.textColor))
        }

        connectionMessage.text = MockFlightData.formatTime(flight.departureTime) + " • " + flight.fullRoute

        // Update time
        val timeAgo = (kotlin.math.abs(flight.id.hashCode()) % 60) + 1
        updatedTimeText.text = "Updated $timeAgo sec ago"

        // Show/hide connection detail card
        if (flight.hasConnection) {
            cardConnectionDetail.visibility = View.VISIBLE
        } else {
            cardConnectionDetail.visibility = View.GONE
        }
    }

    private fun navigateToConnectionRisk() {
        val action = FlightDetailFragmentDirections.actionFlightDetailToConnectionRisk(args.flightId)
        findNavController().navigate(action)
    }

    private fun navigateToTimeline() {
        val action = FlightDetailFragmentDirections.actionFlightDetailToTimeline(args.flightId)
        findNavController().navigate(action)
    }

    private fun showTrackLiveNotImplemented() {
        view?.let {
            com.google.android.material.snackbar.Snackbar.make(
                it,
                "Track Live feature coming soon",
                com.google.android.material.snackbar.Snackbar.LENGTH_SHORT
            ).show()
        }
    }

    private fun showError(message: String) {
        view?.let {
            com.google.android.material.snackbar.Snackbar.make(
                it,
                message,
                com.google.android.material.snackbar.Snackbar.LENGTH_LONG
            ).show()
        }
    }

    private fun getColor(colorRes: Int): Int {
        return requireContext().getColor(colorRes)
    }
}

/**
 * Helper data class for connection status UI
 */
private data class ConnectionStatusUI(
    val backgroundColor: Int,
    val textColor: Int,
    val textRes: Int,
    val message: String
)
