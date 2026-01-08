package com.aerosense.app.data

import com.aerosense.app.data.model.AuthResult
import com.aerosense.app.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Auth Repository - Handles authentication operations
 * UI-ONLY IMPLEMENTATION - No backend calls
 * Uses simulated delays for loading states
 */
class AuthRepository {

    companion object {
        private const val SIMULATED_DELAY_MS = 1500L
    }

    /**
     * Sign up with email and password
     * TODO: Story 1.5 - UI placeholder, no backend call
     */
    suspend fun signUp(
        email: String,
        password: String,
        name: String? = null
    ): AuthResult = withContext(Dispatchers.IO) {
        // Simulate network delay
        delay(SIMULATED_DELAY_MS)

        // Validate input
        if (!isValidEmail(email)) {
            return@withContext AuthResult.Error("Invalid email format")
        }

        if (!isValidPassword(password)) {
            return@withContext AuthResult.Error("Password must be at least 8 characters")
        }

        // TODO: Replace with actual backend call in future stories
        // For now, return success with mock user
        AuthResult.Success
    }

    /**
     * Sign in with email and password
     * TODO: Story 1.5 - UI placeholder, no backend call
     */
    suspend fun signIn(
        email: String,
        password: String
    ): AuthResult = withContext(Dispatchers.IO) {
        // Simulate network delay
        delay(SIMULATED_DELAY_MS)

        // Validate input
        if (!isValidEmail(email)) {
            return@withContext AuthResult.Error("Invalid email format")
        }

        if (password.isEmpty()) {
            return@withContext AuthResult.Error("Password cannot be empty")
        }

        // TODO: Replace with actual backend call in future stories
        // For now, return success
        AuthResult.Success
    }

    /**
     * Sign up with Google OAuth
     * TODO: Future story - Implement actual Google OAuth
     */
    suspend fun signUpWithGoogle(): AuthResult = withContext(Dispatchers.IO) {
        delay(SIMULATED_DELAY_MS)
        AuthResult.Error("Google OAuth not implemented yet")
    }

    /**
     * Sign up with Apple OAuth
     * TODO: Future story - Implement actual Apple OAuth
     */
    suspend fun signUpWithApple(): AuthResult = withContext(Dispatchers.IO) {
        delay(SIMULATED_DELAY_MS)
        AuthResult.Error("Apple Sign In not implemented yet")
    }

    /**
     * Validate email format
     */
    private fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    /**
     * Validate password strength
     */
    private fun isValidPassword(password: String): Boolean {
        return password.length >= 8
    }

    /**
     * Create mock user for testing
     * TODO: Remove when backend is implemented
     */
    fun createMockUser(email: String): User {
        return User(
            id = "mock_user_${System.currentTimeMillis()}",
            email = email,
            name = "Test User",
            avatarUrl = null
        )
    }
}
