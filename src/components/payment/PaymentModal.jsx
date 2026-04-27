import React, { useState, useEffect, useRef } from 'react'
import { api, normalizeApiError, createNormalizedError, ERROR_TYPES } from '../../lib/api.jsx'

export default function PaymentModal({ course, onClose, onSuccess }) {
  const [state, setState] = useState('idle') // idle, loading, polling, success, failed
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [txRef, setTxRef] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const pollIntervalRef = useRef(null)
  const timeoutRef = useRef(null)

  const { price_mwk, title } = course

  // Validate phone number (Malawi format: 08x or 09x)
  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\s/g, '')
    return /^(08|09)\d{8}$/.test(cleanPhone)
  }

  const formatPhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length <= 3) return cleanPhone
    if (cleanPhone.length <= 6) return `${cleanPhone.slice(0,3)} ${cleanPhone.slice(3)}`
    return `${cleanPhone.slice(0,3)} ${cleanPhone.slice(3,6)} ${cleanPhone.slice(6,10)}`
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
    setError('')
  }

  const createPayment = async () => {
    const cleanPhone = phoneNumber.replace(/\s/g, '')
    
    if (!validatePhoneNumber(cleanPhone)) {
      setError('Please enter a valid Malawi phone number (08x or 09x)')
      return
    }

    try {
      setState('loading')
      setError('')

      const data = await api.post('/create-payment', {
        course_id: course.id,
        phone_number: cleanPhone
      })

      setTxRef(data.tx_ref)
      
      // Open PayChangu payment URL in new window
      if (data.payment_url) {
        window.open(data.payment_url, '_blank')
      }

      // Start polling for payment status
      setState('polling')
      startPolling(data.tx_ref)

    } catch (err) {
      const normalized = normalizeApiError(err)
      setError(normalized.message)
      setState('idle')
    }
  }

  const startPolling = (paymentTxRef) => {
    setPollCount(0)
    
    // Poll every 5 seconds for up to 60 seconds (12 attempts)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await api.get(`/payment-status?tx_ref=${paymentTxRef}`)

        setPollCount(prev => prev + 1)

        if (data.status === 'paid') {
          // Payment successful
          clearInterval(pollIntervalRef.current)
          clearTimeout(timeoutRef.current)
          setState('success')
          onSuccess()
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          // Payment failed
          clearInterval(pollIntervalRef.current)
          clearTimeout(timeoutRef.current)
          setState('failed')
          setError('Payment was cancelled or failed. Please try again.')
        } else if (data.status === 'pending' && pollCount >= 11) {
          // Timeout after 60 seconds
          clearInterval(pollIntervalRef.current)
          clearTimeout(timeoutRef.current)
          setState('failed')
          setError('Payment timed out. Please check your phone and try again.')
        }

      } catch (err) {
        console.error('Polling error:', err)
        // Continue polling on network errors
      }
    }, 5000)

    // Set timeout for 60 seconds
    timeoutRef.current = setTimeout(() => {
      clearInterval(pollIntervalRef.current)
      if (state === 'polling') {
        setState('failed')
        const timeoutError = createNormalizedError({
          type: ERROR_TYPES.GENERIC_FAILURE,
          message: 'Payment timed out. Please check your phone and try again.'
        })
        setError(timeoutError.message)
      }
    }, 60000)
  }

  const handleRetry = () => {
    setState('idle')
    setPhoneNumber('')
    setError('')
    setTxRef('')
    setPollCount(0)
  }

  const handleClose = () => {
    // Clean up intervals and timeouts
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    onClose()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unlock Course</h2>
          <p className="text-gray-600">{title}</p>
        </div>

        {/* States */}
        {state === 'idle' && (
          <div className="space-y-6">
            {/* Price display */}
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary-600">
                MWK {price_mwk.toLocaleString()}
              </div>
              <div className="text-sm text-primary-700 mt-1">One-time payment</div>
            </div>

            {/* Phone input */}
            <div>
              <label className="form-label">Mobile Money Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="088 123 4567"
                className={`input-field ${error ? 'input-error' : ''}`}
                maxLength={12}
              />
              {error && (
                <p className="form-error">{error}</p>
              )}
              <p className="form-help">
                Airtel Money or TNM Mpamba (Malawi numbers only)
              </p>
            </div>

            {/* Payment methods */}
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-red-600">A</span>
                </div>
                Airtel Money
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-blue-600">M</span>
                </div>
                TNM Mpamba
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={createPayment}
                disabled={!phoneNumber || !validatePhoneNumber(phoneNumber.replace(/\s/g, ''))}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Pay MWK {price_mwk.toLocaleString()}
              </button>
              <button
                onClick={handleClose}
                className="w-full btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div className="text-center py-8">
            <div className="loading-spinner-lg mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sending payment prompt...
            </h3>
            <p className="text-gray-600">
              Please wait while we send the USSD prompt to your phone
            </p>
          </div>
        )}

        {state === 'polling' && (
          <div className="text-center py-8">
            <div className="loading-spinner-lg mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Check your phone
            </h3>
            <p className="text-gray-600 mb-4">
              We've sent a USSD prompt to {phoneNumber}
            </p>
            <p className="text-sm text-gray-500">
              Please confirm the payment request on your phone... 
              <span className="block mt-1">Checking in {5 - (pollCount % 6)} seconds</span>
            </p>
            <button
              onClick={handleClose}
              className="mt-6 btn-ghost"
            >
              Cancel
            </button>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h3>
            <p className="text-gray-600 mb-6">
              You now have 30 days access to this course
            </p>
            <button
              onClick={handleClose}
              className="btn-primary"
            >
              Start Learning
            </button>
          </div>
        )}

        {state === 'failed' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Payment Failed
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="btn-primary"
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
