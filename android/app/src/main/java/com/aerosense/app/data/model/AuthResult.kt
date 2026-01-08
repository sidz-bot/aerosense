package com.aerosense.app.data.model

/**
 * Authentication result wrapper
 */
sealed class AuthResult {
    data object Success : AuthResult()
    data class Error(val message: String) : AuthResult()
    data object Loading : AuthResult()
}
