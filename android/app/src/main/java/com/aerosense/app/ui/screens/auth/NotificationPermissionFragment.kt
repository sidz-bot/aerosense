package com.aerosense.app.ui.screens.auth

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.navigation.fragment.findNavController
import com.aerosense.app.R
import com.aerosense.app.ui.BaseFragment

/**
 * Notification Permission Screen
 * Explains notification value and requests permission
 */
class NotificationPermissionFragment : BaseFragment() {

    private lateinit var btnAllow: View
    private lateinit var btnNotNow: View

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            navigateToAddFlight()
        } else {
            showPermissionDeniedMessage()
        }
    }

    override fun getLayoutRes(): Int = R.layout.fragment_notification_permission

    override fun setupView(view: View) {
        btnAllow = view.findViewById(R.id.btnAllow)
        btnNotNow = view.findViewById(R.id.btnNotNow)

        // Allow Notifications button
        btnAllow.setOnClickListener {
            requestNotificationPermission()
        }

        // Not Now button
        btnNotNow.setOnClickListener {
            navigateToAddFlight()
        }
    }

    override fun observeData() {
        // No data to observe for this screen
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ - Request POST_NOTIFICATIONS permission
            requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            // Android 12 and below - No permission needed
            navigateToAddFlight()
        }
    }

    private fun navigateToAddFlight() {
        findNavController().navigate(R.id.action_notificationPermission_to_addFirstFlight)
    }

    private fun showPermissionDeniedMessage() {
        // Show message that user can enable in settings later
        view?.let {
            android.widget.Toast.makeText(
                requireContext(),
                "You can enable notifications in Settings later",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }

        // Continue to next screen
        navigateToAddFlight()
    }

    private fun openAppSettings() {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", requireContext().packageName, null)
        }
        startActivity(intent)
    }
}
