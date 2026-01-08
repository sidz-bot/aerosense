package com.aerosense.app.ui.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aerosense.app.data.AuthRepository
import com.aerosense.app.data.SessionManager
import com.aerosense.app.data.model.AuthResult
import com.aerosense.app.data.model.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Shared Auth ViewModel for authentication flow
 * Manages auth state across all auth screens
 */
class AuthViewModel(
    private val authRepository: AuthRepository = AuthRepository(),
    private val sessionManager: SessionManager? = null
) : ViewModel() {

    // Auth state
    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    // Loading state
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    // Error message
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Current user
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    /**
     * Sign up with email and password
     */
    fun signUp(email: String, password: String, name: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            val result = authRepository.signUp(email, password, name)

            when (result) {
                is AuthResult.Success -> {
                    val user = authRepository.createMockUser(email)
                    _currentUser.value = user
                    sessionManager?.saveSession(user)
                    _authState.value = AuthState.Authenticated(user)
                    _isLoading.value = false
                }
                is AuthResult.Error -> {
                    _errorMessage.value = result.message
                    _authState.value = AuthState.Error(result.message)
                    _isLoading.value = false
                }
                is AuthResult.Loading -> {
                    _isLoading.value = true
                }
            }
        }
    }

    /**
     * Sign in with email and password
     */
    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            val result = authRepository.signIn(email, password)

            when (result) {
                is AuthResult.Success -> {
                    val user = authRepository.createMockUser(email)
                    _currentUser.value = user
                    sessionManager?.saveSession(user)
                    _authState.value = AuthState.Authenticated(user)
                    _isLoading.value = false
                }
                is AuthResult.Error -> {
                    _errorMessage.value = result.message
                    _authState.value = AuthState.Error(result.message)
                    _isLoading.value = false
                }
                is AuthResult.Loading -> {
                    _isLoading.value = true
                }
            }
        }
    }

    /**
     * Sign up with Google OAuth
     * TODO: Future story - Implement actual Google OAuth
     */
    fun signUpWithGoogle() {
        viewModelScope.launch {
            _isLoading.value = true

            val result = authRepository.signUpWithGoogle()

            when (result) {
                is AuthResult.Error -> {
                    _errorMessage.value = result.message
                    _isLoading.value = false
                }
                else -> {
                    _isLoading.value = false
                }
            }
        }
    }

    /**
     * Sign up with Apple OAuth
     * TODO: Future story - Implement actual Apple OAuth
     */
    fun signUpWithApple() {
        viewModelScope.launch {
            _isLoading.value = true

            val result = authRepository.signUpWithApple()

            when (result) {
                is AuthResult.Error -> {
                    _errorMessage.value = result.message
                    _isLoading.value = false
                }
                else -> {
                    _isLoading.value = false
                }
            }
        }
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _errorMessage.value = null
    }

    /**
     * Check if user is already logged in
     */
    fun checkAuthStatus() {
        val user = sessionManager?.getCurrentUser()
        if (user != null) {
            _currentUser.value = user
            _authState.value = AuthState.Authenticated(user)
        }
    }

    /**
     * Logout
     */
    fun logout() {
        viewModelScope.launch {
            sessionManager?.clearSession()
            _currentUser.value = null
            _authState.value = AuthState.Idle
        }
    }
}

/**
 * Auth state sealed class
 */
sealed class AuthState {
    data object Idle : AuthState()
    data object Loading : AuthState()
    data class Authenticated(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
}
