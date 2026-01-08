package com.aerosense.app.ui.screens.flights

import android.os.Bundle
import android.view.View
import androidx.navigation.fragment.navArgs
import com.aerosense.app.R
import com.aerosense.app.ui.BaseFragment

/**
 * Gate Change Alert Screen - Full-screen modal
 * Shows critical gate change alert with actions
 */
class GateChangeAlertFragment : BaseFragment() {

    private val args: GateChangeAlertFragmentArgs by navArgs()

    override fun getLayoutRes(): Int = R.layout.fragment_gate_change_alert

    override fun setupView(view: View) {
        // TODO: Implement gate change alert functionality
        // - Display old/new gate info
        // - Wire up get directions button (open maps)
        // - Wire up already there button (dismiss)
        // - Wire up close button
    }
}
