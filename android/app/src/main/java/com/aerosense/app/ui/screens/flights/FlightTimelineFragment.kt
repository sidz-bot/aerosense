package com.aerosense.app.ui.screens.flights

import android.os.Bundle
import android.view.View
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.aerosense.app.R
import com.aerosense.app.data.model.Flight
import com.aerosense.app.ui.BaseFragment
import kotlinx.coroutines.launch

/**
 * Flight Timeline Screen
 * Shows vertical timeline of flight events
 */
class FlightTimelineFragment : BaseFragment() {

    private val args: FlightTimelineFragmentArgs by navArgs()
    private val viewModel: FlightDetailViewModel by viewModels()

    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var rvTimeline: androidx.recyclerview.widget.RecyclerView
    private lateinit var emptyState: View

    private lateinit var timelineAdapter: TimelineAdapter

    override fun getLayoutRes(): Int = R.layout.fragment_flight_timeline

    override fun setupView(view: View) {
        // Initialize views
        swipeRefresh = view.findViewById(R.id.swipeRefresh)
        rvTimeline = view.findViewById(R.id.rvTimeline)
        emptyState = view.findViewById(R.id.emptyState)

        // Setup timeline RecyclerView
        setupTimelineList()

        // Setup pull-to-refresh
        setupPullToRefresh()

        // Setup toolbar back navigation
        view.findViewById<com.google.android.material.appbar.MaterialToolbar>(R.id.toolbar).setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        // Load timeline data
        lifecycleScope.launch {
            viewModel.loadFlight(args.flightId)
        }
    }

    override fun observeData() {
        // Observe flight data
        viewModel.flight.observe(viewLifecycleOwner) { flight ->
            flight?.let {
                // Update toolbar title with flight code
                activity?.title = "Timeline - ${it.flightCode}"
            }
        }

        // Observe timeline events
        viewModel.timelineEvents.observe(viewLifecycleOwner) { events ->
            if (events.isEmpty()) {
                showEmptyState()
            } else {
                hideEmptyState()
                timelineAdapter.submitList(events)
            }
        }

        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            swipeRefresh.isRefreshing = isLoading
        }

        // Observe errors
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                showError(it)
                viewModel.clearError()
            }
        }
    }

    private fun setupTimelineList() {
        timelineAdapter = TimelineAdapter()

        rvTimeline.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = timelineAdapter
            itemAnimator = androidx.recyclerview.widget.DefaultItemAnimator()
        }
    }

    private fun setupPullToRefresh() {
        swipeRefresh.setOnRefreshListener {
            lifecycleScope.launch {
                viewModel.refreshFlight(args.flightId)
            }
        }

        // Set refresh colors
        swipeRefresh.setColorSchemeColors(
            requireContext().getColor(R.color.primary_500),
            requireContext().getColor(R.color.warning),
            requireContext().getColor(R.color.success)
        )
    }

    private fun showEmptyState() {
        emptyState.visibility = View.VISIBLE
        rvTimeline.visibility = View.GONE
    }

    private fun hideEmptyState() {
        emptyState.visibility = View.GONE
        rvTimeline.visibility = View.VISIBLE
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
