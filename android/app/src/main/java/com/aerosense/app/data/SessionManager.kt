package com.aerosense.app.data

import android.content.Context
import android.content.SharedPreferences
import com.aerosense.app.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Session Manager - Handles user session persistence locally
 * Uses SharedPreferences for local storage (no backend)
 */
class SessionManager(private val context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    companion object {
        private const val PREFS_NAME = "aerosense_prefs"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_AVATAR = "user_avatar"
    }

    /**
     * Save user session after successful authentication
     */
    suspend fun saveSession(user: User) = withContext(Dispatchers.IO) {
        prefs.edit().apply {
            putBoolean(KEY_IS_LOGGED_IN, true)
            putString(KEY_USER_ID, user.id)
            putString(KEY_USER_EMAIL, user.email)
            putString(KEY_USER_NAME, user.name)
            putString(KEY_USER_AVATAR, user.avatarUrl)
            apply()
        }
    }

    /**
     * Check if user is logged in
     */
    fun isLoggedIn(): Boolean {
        return prefs.getBoolean(KEY_IS_LOGGED_IN, false)
    }

    /**
     * Get current user session
     */
    fun getCurrentUser(): User? {
        val userId = prefs.getString(KEY_USER_ID, null) ?: return null
        val email = prefs.getString(KEY_USER_EMAIL, null) ?: return null

        return User(
            id = userId,
            email = email,
            name = prefs.getString(KEY_USER_NAME, null),
            avatarUrl = prefs.getString(KEY_USER_AVATAR, null)
        )
    }

    /**
     * Clear user session (logout)
     */
    suspend fun clearSession() = withContext(Dispatchers.IO) {
        prefs.edit().apply {
            clear()
            apply()
        }
    }
}
