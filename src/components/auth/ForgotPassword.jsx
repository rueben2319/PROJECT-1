import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.jsx'

export default function ForgotPassword() {
  const [step, setStep] = useState('form') // 'form' | 'success'
  const [formData, setFormData] = useState({
    identifier: '' // phone or email
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validateForm = () => {
    const newErrors = {}

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Phone number or email is required'
    }

    // Check if it's a valid email or phone number
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^(?:\+265|0)?[9]\d{8}$/
    const cleanIdentifier = formData.identifier.replace(/\s/g, '')
    
    if (!emailRegex.test(cleanIdentifier) && !phoneRegex.test(cleanIdentifier)) {
      newErrors.identifier = 'Please enter a valid email or phone number'
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
      let email = formData.identifier
      
      // Check if identifier is a phone number and convert to email format
      const phoneRegex = /^(?:\+265|0)?[9]\d{8}$/
      if (phoneRegex.test(formData.identifier.replace(/\s/g, ''))) {
        const normalizedPhone = formData.identifier.replace(/\s/g, '').replace(/^0/, '+265')
        email = `${normalizedPhone}@msce-learn.com`
      }

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        if (error.message.includes('User not found')) {
          setErrors({ submit: 'No account found with this phone or email' })
        } else {
          setErrors({ submit: error.message })
        }
        return
      }

      setStep('success')
    } catch (error) {
      setErrors({ submit: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="w-full max-w-md mx-auto p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Reset Link Sent
          </h2>
          <p className="text-gray-600 mb-6">
            We've sent a password reset link to{' '}
            <span className="font-medium">{formData.identifier}</span>
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Check your email or messages and follow the link to reset your password.
            The link will expire in 24 hours.
          </p>
          
          <div className="space-y-4">
            <Link
              to="/login"
              className="block w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-colors text-center"
            >
              Back to Sign In
            </Link>
            
            <button
              onClick={() => setStep('form')}
              className="block w-full text-gray-600 py-3 px-4 rounded-lg font-medium hover:text-gray-700 transition-colors"
            >
              Send to different email/phone
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Reset Password
        </h1>
        <p className="text-gray-600">
          Enter your phone or email to receive a reset link
        </p>
      </div>

      {errors.submit && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number or Email
          </label>
          <input
            id="identifier"
            type="text"
            value={formData.identifier}
            onChange={(e) => handleInputChange('identifier', e.target.value)}
            disabled={loading}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-600 focus:outline-none transition-colors ${
              errors.identifier ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="088 123 4567 or your.email@example.com"
          />
          {errors.identifier && (
            <p className="mt-1 text-sm text-red-600">{errors.identifier}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Sending reset link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link 
          to="/login" 
          className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          ← Back to Sign In
        </Link>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Need Help?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Make sure to check your spam folder</li>
          <li>• Phone numbers receive SMS with reset instructions</li>
          <li>• Reset links expire after 24 hours</li>
        </ul>
      </div>
    </div>
  )
}
