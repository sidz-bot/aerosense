package com.aerosense.app.ui.screens.flights

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.aerosense.app.R
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

/**
 * Add Flight Bottom Sheet Modal
 * Quick flight search from any screen
 */
class AddFlightBottomSheet : BottomSheetDialogFragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.bottom_sheet_add_flight, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // TODO: Implement add flight modal functionality
        // - Wire up flight number input
        // - Wire up route search
        // - Wire up calendar import
        // - Dismiss after adding flight
    }
}
