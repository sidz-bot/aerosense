package com.aerosense.app.ui.screens.flights

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aerosense.app.R
import com.aerosense.app.data.model.TimelineEvent
import com.aerosense.app.databinding.ItemTimelineEventBinding
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * RecyclerView Adapter for Flight Timeline
 * Displays timeline events with status indicators
 */
class TimelineAdapter : ListAdapter<TimelineEvent, TimelineAdapter.TimelineViewHolder>(TimelineDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TimelineViewHolder {
        val binding = ItemTimelineEventBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return TimelineViewHolder(binding)
    }

    override fun onBindViewHolder(holder: TimelineViewHolder, position: Int) {
        val event = getItem(position)
        holder.bind(event)
    }

    class TimelineViewHolder(
        private val binding: ItemTimelineEventBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(event: TimelineEvent) {
            binding.apply {
                // Format time
                val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
                tvTime.text = timeFormat.format(event.time)

                // Title and description
                tvTitle.text = event.title
                event.description?.let {
                    tvDescription.visibility = View.VISIBLE
                    tvDescription.text = it
                } ?: run {
                    tvDescription.visibility = View.GONE
                }

                // Gate info if available
                event.gate?.let {
                    tvGate.visibility = View.VISIBLE
                    tvGate.text = "Gate $it"
                } ?: run {
                    tvGate.visibility = View.GONE
                }

                // Status indicator
                setupStatusIndicator(event)
            }
        }

        private fun setupStatusIndicator(event: TimelineEvent) {
            binding.apply {
                val (dotRes, lineColorRes, statusText, statusColor) = when (event.status) {
                    com.aerosense.app.data.model.EventStatus.COMPLETED -> {
                        quadrupleOf(
                            R.drawable.ic_timeline_dot_completed,
                            R.color.success,
                            "Completed",
                            R.color.success
                        )
                    }
                    com.aerosense.app.data.model.EventStatus.CURRENT -> {
                        quadrupleOf(
                            R.drawable.ic_timeline_dot_current,
                            R.color.primary_500,
                            "In Progress",
                            R.color.primary_500
                        )
                    }
                    com.aerosense.app.data.model.EventStatus.UPCOMING -> {
                        quadrupleOf(
                            R.drawable.ic_timeline_dot_upcoming,
                            R.color.gray_300,
                            "Upcoming",
                            R.color.gray_400
                        )
                    }
                    com.aerosense.app.data.model.EventStatus.CANCELED -> {
                        quadrupleOf(
                            R.drawable.ic_timeline_dot_canceled,
                            R.color.error,
                            "Canceled",
                            R.color.error
                        )
                    }
                }

                // Update timeline dot
                timelineDot.setImageResource(dotRes)

                // Update timeline line color
                timelineLine.setBackgroundColor(
                    android.content.ContextCompat.getColor(
                        root.context,
                        lineColorRes
                    )
                )

                // Update status text
                tvStatus.text = statusText
                tvStatus.setTextColor(
                    android.content.ContextCompat.getColor(
                        root.context,
                        statusColor
                    )
                )

                // Hide line for last item
                val isLastItem = bindingAdapterPosition == itemCount - 1
                timelineLine.visibility = if (isLastItem) View.GONE else View.VISIBLE
            }
        }
    }

    /**
     * Helper function to create a 4-tuple
     */
    private data class Quadruple<A, B, C, D>(
        val first: A,
        val second: B,
        val third: C,
        val fourth: D
    )

    private fun <A, B, C, D> quadrupleOf(
        first: A,
        second: B,
        third: C,
        fourth: D
    ): Quadruple<A, B, C, D> = Quadruple(first, second, third, fourth)

    /**
     * DiffUtil callback for efficient list updates
     */
    private class TimelineDiffCallback : DiffUtil.ItemCallback<TimelineEvent>() {
        override fun areItemsTheSame(oldItem: TimelineEvent, newItem: TimelineEvent): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: TimelineEvent, newItem: TimelineEvent): Boolean {
            return oldItem.status == newItem.status &&
                    oldItem.time == newItem.time &&
                    oldItem.title == newItem.title
        }
    }
}
