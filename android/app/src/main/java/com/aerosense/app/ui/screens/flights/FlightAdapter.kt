package com.aerosense.app.ui.screens.flights

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aerosense.app.R
import com.aerosense.app.data.MockFlightData
import com.aerosense.app.data.model.Flight
import com.aerosense.app.databinding.ItemFlightCardBinding

/**
 * RecyclerView Adapter for Flight List
 * Displays flights with status indicators
 */
class FlightAdapter(
    private val onFlightClick: (Flight) -> Unit
) : ListAdapter<Flight, FlightAdapter.FlightViewHolder>(FlightDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FlightViewHolder {
        val binding = ItemFlightCardBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return FlightViewHolder(binding, onFlightClick)
    }

    override fun onBindViewHolder(holder: FlightViewHolder, position: Int) {
        val flight = getItem(position)
        holder.bind(flight)
    }

    class FlightViewHolder(
        private val binding: ItemFlightCardBinding,
        private val onFlightClick: (Flight) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(flight: Flight) {
            binding.apply {
                // Airline logo placeholder
                airlineLogo.setColorFilter(getColorForAirline(flight.airlineCode))

                // Flight number and route
                flightNumber.text = flight.flightCode
                flightRoute.text = flight.route

                // Departure time
                departureTime.text = MockFlightData.formatTime(flight.departureTime)

                // Gate info
                gateInfo.text = if (flight.terminal != null) {
                    "Gate: ${flight.gate} (Terminal ${flight.terminal})"
                } else {
                    "Gate: ${flight.gate}"
                }

                // Active badge
                if (flight.isToday && flight.status != com.aerosense.app.data.model.FlightStatus.LANDED) {
                    activeBadge.visibility = View.VISIBLE
                    activeBadge.text = "→ Active"
                } else {
                    activeBadge.visibility = View.GONE
                }

                // Status indicator
                setupStatusIndicator(flight)

                // Click listener
                root.setOnClickListener { onFlightClick(flight) }
            }
        }

        private fun setupStatusIndicator(flight: Flight) {
            binding.statusContainer.apply {
                val statusColor = when (flight.status) {
                    com.aerosense.app.data.model.FlightStatus.ON_TIME,
                    com.aerosense.app.data.model.FlightStatus.LANDED -> R.color.success
                    com.aerosense.app.data.model.FlightStatus.DELAYED -> R.color.warning
                    com.aerosense.app.data.model.FlightStatus.CANCELED -> R.color.error
                    com.aerosense.app.data.model.FlightStatus.BOARDING,
                    com.aerosense.app.data.model.FlightStatus.IN_AIR -> R.color.primary_500
                    else -> R.color.gray_400
                }

                val backgroundColor = when (flight.status) {
                    com.aerosense.app.data.model.FlightStatus.ON_TIME,
                    com.aerosense.app.data.model.FlightStatus.LANDED -> R.color.success_light
                    com.aerosense.app.data.model.FlightStatus.DELAYED -> R.color.warning_light
                    com.aerosense.app.data.model.FlightStatus.CANCELED -> R.color.error_light
                    com.aerosense.app.data.model.FlightStatus.BOARDING,
                    com.aerosense.app.data.model.FlightStatus.IN_AIR -> R.color.info_light
                    else -> R.color.gray_100
                }

                setBackgroundResource(backgroundColor)
                backgroundTintList = null

                statusText.text = flight.getDelayText()
                statusColor?.let {
                    statusText.setTextColor(ContextCompat.getColor(root.context, statusColor))
                }

                // Status message
                val message = when (flight.status) {
                    com.aerosense.app.data.model.FlightStatus.ON_TIME -> "Your connection is on schedule. Relax, you have time."
                    com.aerosense.app.data.model.FlightStatus.DELAYED -> "Flight delayed ${flight.delayMinutes} minutes"
                    com.aerosense.app.data.model.FlightStatus.BOARDING -> "Now boarding at gate ${flight.gate}"
                    com.aerosense.app.data.model.FlightStatus.IN_AIR -> "Flight is in the air"
                    com.aerosense.app.data.model.FlightStatus.LANDED -> "Flight has landed"
                    else -> "Scheduled on time"
                }
                statusMessage.text = message

                // Updated time
                updatedTime.text = "Updated ${getTimeAgo(flight)} sec ago"
            }
        }

        private fun getColorForAirline(airlineCode: String): Int {
            // Generate consistent color from airline code
            val colors = listOf(
                Color.parseColor("#2196F3"), // Blue
                Color.parseColor("#FF9800"), // Orange
                Color.parseColor("#4CAF50"), // Green
                Color.parseColor("#F44336"), // Red
                Color.parseColor("#9C27B0")  // Purple
            )
            val index = kotlin.math.abs(airlineCode.hashCode()) % colors.size
            return colors[index]
        }

        private fun getTimeAgo(flight: Flight): Int {
            // Mock: return random time between 5-60 seconds
            return (kotlin.math.abs(flight.id.hashCode()) % 55) + 5
        }
    }

    /**
     * DiffUtil callback for efficient list updates
     */
    private class FlightDiffCallback : DiffUtil.ItemCallback<Flight>() {
        override fun areItemsTheSame(oldItem: Flight, newItem: Flight): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Flight, newItem: Flight): Boolean {
            return oldItem.status == newItem.status &&
                    oldItem.delayMinutes == newItem.delayMinutes &&
                    oldItem.gate == newItem.gate
        }
    }
}
