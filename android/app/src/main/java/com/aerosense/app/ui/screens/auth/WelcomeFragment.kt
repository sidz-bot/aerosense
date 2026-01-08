package com.aerosense.app.ui.screens.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import androidx.core.content.ContextCompat
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.aerosense.app.R
import com.aerosense.app.ui.BaseFragment
import com.aerosense.app.ui.navigation.AuthViewModel
import com.google.android.material.snackbar.Snackbar

/**
 * Welcome Screen - First screen of onboarding flow
 * Shows value proposition and Get Started/Sign In buttons
 */
class WelcomeFragment : BaseFragment() {

    private val authViewModel: AuthViewModel by activityViewModels()

    override fun getLayoutRes(): Int = R.layout.fragment_welcome

    override fun setupView(view: View) {
        // Check if user is already logged in
        authViewModel.checkAuthStatus()
        authViewModel.authState.observe(viewLifecycleOwner) { state ->
            if (state is com.aerosense.app.ui.navigation.AuthState.Authenticated) {
                // User is already logged in, navigate to main app
                findNavController().navigate(R.id.action_welcome_to_main)
            }
        }

        // Get Started button - Navigate to Sign Up
        view.findViewById<View>(R.id.btnGetStarted).setOnClickListener {
            findNavController().navigate(R.id.action_welcome_to_signUp)
        }

        // Sign In button - Navigate to Sign In
        view.findViewById<View>(R.id.btnSignIn).setOnClickListener {
            findNavController().navigate(R.id.action_welcome_to_signIn)
        }
    }

    override fun observeData() {
        // No data to observe for Welcome screen
    }
}
