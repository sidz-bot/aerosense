package com.aerosense.app.ui.screens.auth

import android.app.ProgressDialog
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.inputmethod.InputMethodManager
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.aerosense.app.R
import com.aerosense.app.ui.BaseFragment
import com.aerosense.app.ui.navigation.AuthViewModel
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText

/**
 * Sign Up Screen - User registration
 * Supports OAuth (Google, Apple) and email/password
 */
class SignUpFragment : BaseFragment() {

    private val authViewModel: AuthViewModel by activityViewModels()
    private var progressDialog: ProgressDialog? = null

    private lateinit var etEmail: TextInputEditText
    private lateinit var etPassword: TextInputEditText
    private lateinit var btnSignUp: View
    private lateinit var btnGoogle: View
    private lateinit var btnApple: View
    private lateinit var tvSignInLink: View

    override fun getLayoutRes(): Int = R.layout.fragment_sign_up

    override fun setupView(view: View) {
        // Initialize views
        etEmail = view.findViewById(R.id.etEmail)
        etPassword = view.findViewById(R.id.etPassword)
        btnSignUp = view.findViewById(R.id.btnSignUp)
        btnGoogle = view.findViewById(R.id.btnGoogleSignUp)
        btnApple = view.findViewById(R.id.btnAppleSignUp)
        tvSignInLink = view.findViewById(R.id.tvSignInLink)

        // Setup form validation
        setupFormValidation()

        // Sign Up button - Email/Password registration
        btnSignUp.setOnClickListener {
            handleSignUp()
        }

        // Google OAuth button - Placeholder
        btnGoogle.setOnClickListener {
            showGoogleOAuthNotImplemented()
        }

        // Apple OAuth button - Placeholder
        btnApple.setOnClickListener {
            showAppleOAuthNotImplemented()
        }

        // Sign In link - Navigate to Sign In
        tvSignInLink.setOnClickListener {
            findNavController().navigate(R.id.action_signUp_to_signIn)
        }
    }

    override fun observeData() {
        // Observe auth state
        authViewModel.authState.observe(viewLifecycleOwner) { state ->
            when (state) {
                is com.aerosense.app.ui.navigation.AuthState.Loading -> {
                    showLoading()
                }
                is com.aerosense.app.ui.navigation.AuthState.Authenticated -> {
                    hideLoading()
                    navigateToNextScreen()
                }
                is com.aerosense.app.ui.navigation.AuthState.Error -> {
                    hideLoading()
                    showError(state.message)
                }
                else -> {
                    hideLoading()
                }
            }
        }

        // Observe loading state
        authViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            btnSignUp.isEnabled = !isLoading
        }

        // Observe errors
        authViewModel.errorMessage.observe(viewLifecycleOwner) { error ->
            error?.let {
                if (it.isNotEmpty()) {
                    showError(it)
                    authViewModel.clearError()
                }
            }
        }
    }

    private fun setupFormValidation() {
        // Enable/disable sign up button based on form validity
        val textWatcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                validateForm()
            }
            override fun afterTextChanged(s: Editable?) {}
        }

        etEmail.addTextChangedListener(textWatcher)
        etPassword.addTextChangedListener(textWatcher)

        // Initial validation
        validateForm()
    }

    private fun validateForm() {
        val email = etEmail.text.toString()
        val password = etPassword.text.toString()

        val isEmailValid = android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
        val isPasswordValid = password.length >= 8

        btnSignUp.isEnabled = isEmailValid && isPasswordValid && !authViewModel.isLoading.value
    }

    private fun handleSignUp() {
        val email = etEmail.text.toString().trim()
        val password = etPassword.text.toString()

        // Hide keyboard
        hideKeyboard()

        // Attempt sign up
        authViewModel.signUp(email, password)
    }

    private fun navigateToNextScreen() {
        // Navigate to notification permission
        findNavController().navigate(R.id.action_signUp_to_notificationPermission)
    }

    private fun showLoading() {
        if (progressDialog == null) {
            progressDialog = ProgressDialog(requireContext()).apply {
                setMessage("Creating account...")
                setCancelable(false)
            }
        }
        progressDialog?.show()
    }

    private fun hideLoading() {
        progressDialog?.dismiss()
        progressDialog = null
    }

    private fun showError(message: String) {
        view?.let {
            Snackbar.make(it, message, Snackbar.LENGTH_LONG)
                .setAction("Retry") { handleSignUp() }
                .show()
        }
    }

    private fun showGoogleOAuthNotImplemented() {
        view?.let {
            Snackbar.make(
                it,
                "Google Sign In coming soon",
                Snackbar.LENGTH_SHORT
            ).show()
        }
    }

    private fun showAppleOAuthNotImplemented() {
        view?.let {
            Snackbar.make(
                it,
                "Apple Sign In coming soon",
                Snackbar.LENGTH_SHORT
            ).show()
        }
    }

    private fun hideKeyboard() {
        val imm = requireContext().getSystemService(android.content.Context.INPUT_METHOD_SERVICE)
                as InputMethodManager
        imm.hideSoftInputFromWindow(view?.windowToken, 0)
    }
}
