package com.aerosense.app

import android.app.Application
import com.aerosense.app.data.AuthRepository
import com.aerosense.app.data.SessionManager

/**
 * AeroSense Application class
 * Provides singleton instances of repositories and managers
 */
class AeroSenseApplication : Application() {

    val sessionManager by lazy { SessionManager(this) }
    val authRepository by lazy { AuthRepository() }

    companion object {
        lateinit var instance: AeroSenseApplication
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }
}
