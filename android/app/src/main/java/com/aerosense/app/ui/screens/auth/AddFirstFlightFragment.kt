package com.aerosense.app.ui.screens.auth

import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.aerosense.app.R
import com.aerosense.app.ui.BaseFragment
import com.aerosense.app.ui.navigation.AuthViewModel
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Add First Flight Screen - Part of onboarding
 * Users add their first flight to complete onboarding
 */
class AddFirstFlightFragment : BaseFragment() {

    private val authViewModel: AuthViewModel by activityViewModels()

    private lateinit var etFlightNumber: TextInputEditText
    private lateinit var cardRouteSearch: View
    private lateinit var cardCalendarImport: View
    private lateinit var btnSkip: View

    override fun getLayoutRes(): Int = R.layout.fragment_add_first_flight

    override fun setupView(view: View) {
        // Initialize views
        etFlightNumber = view.findViewById(R.id.etFlightNumber)
        cardRouteSearch = view.findViewById(R.id.cardRouteSearch)
        cardCalendarImport = view.findViewById(R.id.cardCalendarImport)
        btnSkip = view.findViewById(R.id.btnSkip)

        // Setup flight number input
        setupFlightNumberInput()

        // Route Search card - Not implemented yet
        cardRouteSearch.setOnClickListener {
            showRouteSearchNotImplemented()
        }

        // Calendar Import card - Not implemented yet
        cardCalendarImport.setOnClickListener {
            showCalendarImportNotImplemented()
        }

        // Skip button
        btnSkip.setOnClickListener {
            navigateToMainApp()
        }

        // Help link
        view.findViewById<View>(R.id.tvWhatsFlightNumber).setOnClickListener {
            showFlightNumberHelp()
        }
    }

    override fun observeData() {
        // No data to observe for this screen
    }

    private fun setupFlightNumberInput() {
        // Auto-capitalize flight number input
        etFlightNumber.apply {
            isSingleLine = true
            inputType = android.text.InputType.TYPE_CLASS_TEXT
                or android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS

            // Add text watcher to auto-format
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                    // Auto-capitalize as user types
                    s?.let {
                        if (it.isNotEmpty()) {
                            val upper = it.toString().uppercase()
                            if (upper != it.toString()) {
                                etFlightNumber.setText(upper)
                                etFlightNumber.setSelection(upper.length)
                            }
                        }
                    }
                }
                override fun afterTextChanged(s: Editable?) {}
            })

            // Handle "Enter" key
            setOnEditorActionListener { _, _, _ ->
                addFlightByNumber()
                true
            }
        }
    }

    private fun addFlightByNumber() {
        val flightNumber = etFlightNumber.text.toString().trim()

        if (flightNumber.isEmpty()) {
            showError("Please enter a flight number")
            return
        }

        // TODO: Story 1.5 - UI placeholder, no actual flight search
        // In future stories, this will:
        // 1. Call flight search API
        // 2. Show flight confirmation dialog
        // 3. Add flight to user's tracked flights

        // For now, simulate success and navigate to main app
        view?.let {
            Snackbar.make(
                it,
                "Flight search not implemented yet. Skipping to main app.",
                Snackbar.LENGTH_SHORT
            ).show()
        }

        navigateToMainApp()
    }

    private fun navigateToMainApp() {
        findNavController().navigate(R.id.action_addFirstFlight_to_main)
    }

    private fun showRouteSearchNotImplemented() {
        view?.let {
            Snackbar.make(
                it,
                "Route search coming soon",
                Snackbar.LENGTH_SHORT
            ).show()
        }
    }

    private fun showCalendarImportNotImplemented() {
        view?.let {
            Snackbar.make(
                it,
                "Calendar import coming soon",
                Snackbar.LENGTH_SHORT
            ).show()
        }
    }

    private fun showFlightNumberHelp() {
        view?.let {
            Snackbar.make(
                it,
                "Flight number format: Airline code + number (e.g., AA 1234, UA 567)",
                Snackbar.LENGTH_LONG
            ).show()
        }
    }

    private fun showError(message: String) {
        view?.let {
            Snackbar.make(it, message, Snackbar.LENGTH_SHORT).show()
        }
    }
}
