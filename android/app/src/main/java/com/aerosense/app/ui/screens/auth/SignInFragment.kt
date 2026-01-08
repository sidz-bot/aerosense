package com.aerosense.app.ui.screens.auth

import android.app.ProgressDialog
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
 * Sign In Screen - User authentication
 * Supports OAuth (Google, Apple) and email/password
 */
class SignInFragment : BaseFragment() {

    private val authViewModel: AuthViewModel by activityViewModels()
    private var progressDialog: ProgressDialog? = null

    private lateinit var etEmail: TextInputEditText
    private lateinit var etPassword: TextInputEditText
    private lateinit var btnSignIn: View
    private lateinit var btnGoogle: View
    private lateinit var btnApple: View

    override fun getLayoutRes(): Int = R.layout.fragment_sign_in

    override fun setupView(view: View) {
        // Initialize views
        etEmail = view.findViewById(R.id.etEmail)
        etPassword = view.findViewById(R.id.etPassword)
        btnSignIn = view.findViewById(R.id.btnSignIn)
        btnGoogle = view.findViewById(R.id.btnGoogleSignIn)
        btnApple = view.findViewById(R.id.btnAppleSignIn)

        // Setup form validation
        setupFormValidation()

        // Sign In button
        btnSignIn.setOnClickListener {
            handleSignIn()
        }

        // Google OAuth button - Placeholder
        btnGoogle.setOnClickListener {
            showGoogleOAuthNotImplemented()
        }

        // Apple OAuth button - Placeholder
        btnApple.setOnClickListener {
            showAppleOAuthNotImplemented()
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
                    navigateToMainApp()
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
            btnSignIn.isEnabled = !isLoading
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
        // Enable/disable sign in button based on form validity
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
        val isPasswordValid = password.isNotEmpty()

        btnSignIn.isEnabled = isEmailValid && isPasswordValid && !authViewModel.isLoading.value
    }

    private fun handleSignIn() {
        val email = etEmail.text.toString().trim()
        val password = etPassword.text.toString()

        // Hide keyboard
        hideKeyboard()

        // Attempt sign in
        authViewModel.signIn(email, password)
    }

    private fun navigateToMainApp() {
        // Navigate to main app (FlightsFragment)
        findNavController().navigate(R.id.action_signIn_to_main)
    }

    private fun showLoading() {
        if (progressDialog == null) {
            progressDialog = ProgressDialog(requireContext()).apply {
                setMessage("Signing in...")
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
                .setAction("Retry") { handleSignIn() }
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
