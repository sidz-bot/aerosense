package com.aerosense.app.data.model

/**
 * User data model
 */
data class User(
    val id: String,
    val email: String,
    val name: String? = null,
    val avatarUrl: String? = null
)
