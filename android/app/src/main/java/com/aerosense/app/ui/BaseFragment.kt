package com.aerosense.app.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.annotation.LayoutRes
import androidx.fragment.app.Fragment
import androidx.viewbinding.ViewBinding

/**
 * Base Fragment for all AeroSense fragments
 * Provides common functionality and reduces boilerplate
 */
abstract class BaseFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(getLayoutRes(), container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupView(view)
        observeData()
    }

    @LayoutRes
    protected abstract fun getLayoutRes(): Int

    protected open fun setupView(view: View) {
        // Override in subclasses
    }

    protected open fun observeData() {
        // Override in subclasses to observe ViewModels
    }
}
