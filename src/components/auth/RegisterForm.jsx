import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.jsx'
import { normalizeAuthError } from '../../lib/api.jsx'
import OTPInput from './OTPInput.jsx'

export default function RegisterForm() {
  const [step, setStep] = useState('form') // 'form' | 'otp'
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [userId, setUserId] = useState(null)
  const navigate = useNavigate()

  const validatePhone = (phone) => {
    const malawiPhoneRegex = /^(?:\+265|0)?[9]\d{8}$/
    return malawiPhoneRegex.test(phone.replace(/\s/g, ''))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid Malawi phone number (08x or 09x)'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      // Normalize phone number
      const normalizedPhone = formData.phone.replace(/\s/g, '').replace(/^0/, '+265')
      
      // Create user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: formData.email || `${normalizedPhone}@msce-learn.com`,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: normalizedPhone,
            email: formData.email || null
          }
        }
      })

      if (error) {
        const normalized = normalizeAuthError(error)
        setErrors({ submit: normalized.message })
        return
      }

      if (data.user) {
        setUserId(data.user.id)
        setStep('otp')
        setOtpSent(true)
      }
    } catch (error) {
      setErrors({ submit: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleOTPComplete = async (otp) => {
    setLoading(true)
    setErrors({})

    try {
      // Verify OTP with Supabase
      const { error } = await supabase.auth.verifyOtp({
        token: otp,
        type: 'signup'
      })

      if (error) {
        setErrors({ otp: 'Invalid verification code. Please try again.' })
        return
      }

      // Update profile with additional info
      if (userId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            phone: formData.phone.replace(/\s/g, '').replace(/^0/, '+265'),
            email: formData.email || null
          })
          .eq('id', userId)

        if (profileError) {
          console.error('Profile update error:', profileError)
        }
      }

      navigate('/dashboard')
    } catch (error) {
      setErrors({ otp: 'Verification failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!userId) return

    setLoading(true)
    setErrors({})

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email || `${formData.phone.replace(/\s/g, '').replace(/^0/, '+265')}@msce-learn.com`
      })

      if (error) {
        setErrors({ otp: 'Failed to resend code. Please try again.' })
      }
    } catch (error) {
      setErrors({ otp: 'Failed to resend code. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <div className="w-full max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verify your account
          </h2>
          <p className="text-gray-600">
            We've sent a 6-digit code to {formData.email || formData.phone}
          </p>
        </div>

        {errors.otp && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.otp}</p>
          </div>
        )}

        <OTPInput
          onComplete={handleOTPComplete}
          onResend={handleResendOTP}
          disabled={loading}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setStep('form')}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300 transition-colors"
          >
            ← Back to registration
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Join MSCE Learn
        </h1>
        <p className="text-gray-600">
          Start your learning journey today
        </p>
      </div>

      {errors.submit && (
        <div className="mb-4 alert-error">
          <p className="text-sm font-medium">{errors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-group">
          <label htmlFor="fullName" className="form-label">
            Full Name *
          </label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            disabled={loading}
            className={`input-field ${
              errors.fullName ? 'input-error' : ''
            }`}
            placeholder="Enter your full name"
          />
          {errors.fullName && (
            <p className="form-error">{errors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            disabled={loading}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-600 focus:outline-none transition-colors ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="088 123 4567 or 099 123 4567"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={loading}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-600 focus:outline-none transition-colors ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="your.email@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            disabled={loading}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-600 focus:outline-none transition-colors ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Create a password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password *
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            disabled={loading}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-600 focus:outline-none transition-colors ${
              errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="loading-spinner mr-2"></div>
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
