package com.aerosense.app.ui

import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupActionBarWithNavController
import androidx.navigation.ui.setupWithNavController
import com.aerosense.app.AeroSenseApplication
import com.aerosense.app.R
import com.aerosense.app.ui.navigation.AuthViewModel
import com.google.android.material.bottomnavigation.BottomNavigationView

/**
 * Main Activity - Host for all navigation
 * Handles NavHost, Top App Bar, Bottom Navigation, and Auth state
 */
class MainActivity : AppCompatActivity() {

    private lateinit var navHostFragment: NavHostFragment
    private lateinit var bottomNavigationView: BottomNavigationView
    private lateinit var authViewModel: AuthViewModel

    // Top-level destinations (show back button for all others)
    private val topLevelDestinations = setOf(
        R.id.flightsFragment,
        R.id.notificationsFragment,
        R.id.settingsFragment
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize AuthViewModel with SessionManager
        val app = application as AeroSenseApplication
        authViewModel = ViewModelProvider(
            this,
            AuthViewModelFactory(app.sessionManager, app.authRepository)
        )[AuthViewModel::class.java]

        setupNavigation()
        checkAuthState()
    }

    private fun setupNavigation() {
        // Setup NavHostFragment
        navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_container) as NavHostFragment
        val navController = navHostFragment.navController

        // Setup Bottom Navigation
        bottomNavigationView = findViewById(R.id.bottom_navigation)
        bottomNavigationView.setupWithNavController(navController)

        // Setup Top App Bar with Navigation
        val appBarConfiguration = AppBarConfiguration(topLevelDestinations)
        setupActionBarWithNavController(navController, appBarConfiguration)

        // Handle navigation to auth screens - hide bottom nav
        navController.addOnDestinationChangedListener { _, destination, _ ->
            when (destination.id) {
                R.id.welcomeFragment,
                R.id.signUpFragment,
                R.id.signInFragment,
                R.id.notificationPermissionFragment,
                R.id.addFirstFlightFragment -> {
                    bottomNavigationView.visibility = android.view.View.GONE
                    supportActionBar?.hide()
                }
                else -> {
                    bottomNavigationView.visibility = android.view.View.VISIBLE
                    supportActionBar?.show()
                }
            }
        }
    }

    private fun checkAuthState() {
        // Check if user is already logged in
        authViewModel.checkAuthStatus()

        // Observe auth state to handle navigation
        authViewModel.authState.observe(this) { state ->
            when (state) {
                is com.aerosense.app.ui.navigation.AuthState.Authenticated -> {
                    // User is logged in, no action needed
                    // NavGraph will handle appropriate destination
                }
                is com.aerosense.app.ui.navigation.AuthState.Idle -> {
                    // User not logged in, ensure we're on welcome screen
                    // NavGraph start destination is welcome, so this is handled automatically
                }
                else -> {
                    // Loading or Error states handled by auth screens
                }
            }
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        return navHostFragment.navController.navigateUp()
            || super.onSupportNavigateUp()
    }
}

/**
 * Custom Factory for AuthViewModel with SessionManager
 */
class AuthViewModelFactory(
    private val sessionManager: com.aerosense.app.data.SessionManager,
    private val authRepository: com.aerosense.app.data.AuthRepository
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthViewModel::class.java)) {
            return AuthViewModel(authRepository, sessionManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
