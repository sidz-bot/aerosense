package com.aerosense.app.ui.screens.flights

import android.os.Bundle
import android.view.View
import androidx.navigation.fragment.navArgs
import com.aerosense.app.R
import com.aerosense.app.ui.BaseFragment

/**
 * Delay Alert Screen - Full-screen modal
 * Shows flight delay alert with impact assessment
 */
class DelayAlertFragment : BaseFragment() {

    private val args: DelayAlertFragmentArgs by navArgs()

    override fun getLayoutRes(): Int = R.layout.fragment_delay_alert

    override fun setupView(view: View) {
        // TODO: Implement delay alert functionality
        // - Display original/new departure times
        // - Show connection impact assessment
        // - Wire up view timeline button
        // - Wire up close button
    }
}
