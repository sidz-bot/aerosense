package com.aerosense.app.ui.screens.flights

import android.os.Bundle
import android.view.View
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.aerosense.app.R
import com.aerosense.app.ui.BaseFragment
import com.aerosense.app.ui.navigation.AuthViewModel

/**
 * Flights Screen - Home screen (Bottom Nav Tab 1)
 * Shows list of tracked flights grouped by Today/Upcoming
 */
class FlightsFragment : BaseFragment() {

    private val authViewModel: AuthViewModel by activityViewModels()
    private val flightListViewModel: FlightListViewModel by viewModels()

    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var todayLabel: View
    private lateinit var rvTodayFlights: androidx.recyclerview.widget.RecyclerView
    private lateinit var upcomingLabel: View
    private lateinit var rvUpcomingFlights: androidx.recyclerview.widget.RecyclerView
    private lateinit var emptyState: View

    private lateinit var todayAdapter: FlightAdapter
    private lateinit var upcomingAdapter: FlightAdapter

    override fun getLayoutRes(): Int = R.layout.fragment_flights

    override fun setupView(view: View) {
        // Initialize views
        swipeRefresh = view.findViewById(R.id.swipeRefresh)
        todayLabel = view.findViewById(R.id.tvTodayLabel)
        rvTodayFlights = view.findViewById(R.id.rvTodayFlights)
        upcomingLabel = view.findViewById(R.id.tvUpcomingLabel)
        rvUpcomingFlights = view.findViewById(R.id.rvUpcomingFlights)
        emptyState = view.findViewById(R.id.emptyState)

        // Setup RecyclerViews
        setupTodayFlightsList()
        setupUpcomingFlightsList()

        // Setup pull-to-refresh
        setupPullToRefresh()

        // Setup Add Flight button
        view.findViewById<View>(R.id.btnAddFlight).setOnClickListener {
            showAddFlight()
        }
    }

    override fun observeData() {
        // Observe flights
        flightListViewModel.flights.observe(viewLifecycleOwner) { flights ->
            updateFlightLists()
        }

        // Observe loading state
        flightListViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            swipeRefresh.isRefreshing = isLoading
        }

        // Observe empty state
        flightListViewModel.isEmpty.observe(viewLifecycleOwner) { isEmpty ->
            if (isEmpty) {
                showEmptyState()
            } else {
                hideEmptyState()
            }
        }

        // Observe errors
        flightListViewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                showError(it)
                flightListViewModel.clearError()
            }
        }

        // Load initial data
        viewLifecycleOwner.lifecycle.addObserver(androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                flightListViewModel.loadFlights()
            }
        })
    }

    private fun setupTodayFlightsList() {
        todayAdapter = FlightAdapter { flight ->
            navigateToFlightDetail(flight.id)
        }

        rvTodayFlights.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = todayAdapter
            isNestedScrollingEnabled = false
        }
    }

    private fun setupUpcomingFlightsList() {
        upcomingAdapter = FlightAdapter { flight ->
            navigateToFlightDetail(flight.id)
        }

        rvUpcomingFlights.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = upcomingAdapter
            isNestedScrollingEnabled = false
        }
    }

    private fun setupPullToRefresh() {
        swipeRefresh.setOnRefreshListener {
            flightListViewModel.refreshFlights()
        }

        // Set refresh colors
        swipeRefresh.setColorSchemeColors(
            requireContext().getColor(R.color.primary_500),
            requireContext().getColor(R.color.warning),
            requireContext().getColor(R.color.success)
        )
    }

    private fun updateFlightLists() {
        val todayFlights = flightListViewModel.getTodayFlights()
        val upcomingFlights = flightListViewModel.getUpcomingFlights()

        // Update today section
        if (todayFlights.isNotEmpty()) {
            todayLabel.visibility = View.VISIBLE
            rvTodayFlights.visibility = View.VISIBLE
            todayAdapter.submitList(todayFlights)
        } else {
            todayLabel.visibility = View.GONE
            rvTodayFlights.visibility = View.GONE
        }

        // Update upcoming section
        if (upcomingFlights.isNotEmpty()) {
            upcomingLabel.visibility = View.VISIBLE
            rvUpcomingFlights.visibility = View.VISIBLE
            upcomingAdapter.submitList(upcomingFlights)
        } else {
            upcomingLabel.visibility = View.GONE
            rvUpcomingFlights.visibility = View.GONE
        }

        // Show/hide empty state
        if (todayFlights.isEmpty() && upcomingFlights.isEmpty()) {
            showEmptyState()
        } else {
            hideEmptyState()
        }
    }

    private fun showEmptyState() {
        emptyState.visibility = View.VISIBLE
        rvTodayFlights.visibility = View.GONE
        rvUpcomingFlights.visibility = View.GONE
        todayLabel.visibility = View.GONE
        upcomingLabel.visibility = View.GONE

        // Configure empty state for flights
        emptyState.findViewById<View>(R.id.emptyIcon).apply {
            setBackgroundResource(R.drawable.ic_flight)
        }
        emptyState.findViewById<com.google.android.material.textview.MaterialTextView>(
            R.id.emptyTitle
        ).text = "No flights tracked"

        emptyState.findViewById<com.google.android.material.textview.MaterialTextView>(
            R.id.emptyMessage
        ).text = "Add a flight to get started"

        emptyState.findViewById<com.google.android.material.button.MaterialButton>(
            R.id.primaryActionButton
        ).setOnClickListener {
            showAddFlight()
        }
    }

    private fun hideEmptyState() {
        emptyState.visibility = View.GONE
    }

    private fun showAddFlight() {
        // Show add flight bottom sheet
        // TODO: Navigate to add flight modal when implemented
        view?.let {
            android.widget.Toast.makeText(
                requireContext(),
                "Add Flight feature coming in next story",
                android.widget.Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun navigateToFlightDetail(flightId: String) {
        val action = FlightsFragmentDirections.actionFlightsToFlightDetail(flightId)
        findNavController().navigate(action)
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
}
