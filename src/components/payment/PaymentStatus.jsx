import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, normalizeApiError, createNormalizedError, ERROR_TYPES } from '../../lib/api.jsx'

export default function PaymentStatus() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const txRef = searchParams.get('tx_ref')
  
  const [status, setStatus] = useState('loading') // loading, success, failed, error
  const [paymentData, setPaymentData] = useState(null)
  const [error, setError] = useState('')
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    if (!txRef) {
      setError('No payment reference found')
      setStatus('error')
      return
    }

    pollPaymentStatus()
  }, [txRef])

  const pollPaymentStatus = async () => {
    try {
      // Initial check
      const data = await api.get(`/payment-status?tx_ref=${txRef}`)
      setPaymentData(data)

      if (data.status === 'paid') {
        setStatus('success')
        // Redirect to course after 3 seconds
        setTimeout(() => {
          if (data.course_id) {
            navigate(`/course/${data.course_id}`)
          } else {
            navigate('/')
          }
        }, 3000)
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        setStatus('failed')
      } else {
        // Continue polling for pending payments
        setStatus('loading')
        startPolling()
      }

    } catch (err) {
      const normalized = normalizeApiError(err)
      setError(normalized.message)
      setStatus('error')
    }
  }

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const data = await api.get(`/payment-status?tx_ref=${txRef}`)
        setPaymentData(data)
        setPollCount(prev => prev + 1)

        if (data.status === 'paid') {
          clearInterval(pollInterval)
          setStatus('success')
          // Redirect to course after 3 seconds
          setTimeout(() => {
            if (data.course_id) {
              navigate(`/course/${data.course_id}`)
            } else {
              navigate('/')
            }
          }, 3000)
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(pollInterval)
          setStatus('failed')
        } else if (pollCount >= 12) { // 60 seconds timeout
          clearInterval(pollInterval)
          setStatus('failed')
          setError(createNormalizedError({
            type: ERROR_TYPES.GENERIC_FAILURE,
            message: 'Payment verification timed out'
          }).message)
        }

      } catch (err) {
        console.error('Polling error:', err)
        // Continue polling on network errors
      }
    }, 5000)

    // Set timeout for 60 seconds
    setTimeout(() => {
      clearInterval(pollInterval)
      if (status === 'loading') {
        setStatus('failed')
        setError(createNormalizedError({
          type: ERROR_TYPES.GENERIC_FAILURE,
          message: 'Payment verification timed out'
        }).message)
      }
    }, 60000)
  }

  const handleGoHome = () => {
    navigate('/')
  }

  const handleRetry = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-50 via-white to-accent-50/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="p-6 text-center">
            {/* Loading State */}
            {status === 'loading' && (
              <>
                <div className="loading-spinner-lg mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Verifying Payment
                </h2>
                <p className="text-gray-600 mb-4">
                  Please wait while we confirm your payment status...
                </p>
                {paymentData && (
                  <div className="text-sm text-gray-500">
                    Transaction ID: {txRef}
                  </div>
                )}
              </>
            )}

            {/* Success State */}
            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Payment Successful!
                </h2>
                <p className="text-gray-600 mb-4">
                  Your course access has been unlocked for 30 days
                </p>
                {paymentData && (
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <div>Transaction ID: {txRef}</div>
                    {paymentData.amount_mwk && (
                      <div>Amount: MWK {paymentData.amount_mwk.toLocaleString()}</div>
                    )}
                  </div>
                )}
                <p className="text-sm text-primary-600">
                  Redirecting to your course...
                </p>
              </>
            )}

            {/* Failed State */}
            {status === 'failed' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Payment Failed
                </h2>
                <p className="text-gray-600 mb-4">
                  {error || 'Your payment could not be completed'}
                </p>
                {paymentData && (
                  <div className="text-sm text-gray-500 mb-4">
                    Transaction ID: {txRef}
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    onClick={handleRetry}
                    className="btn-primary"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleGoHome}
                    className="btn-ghost"
                  >
                    Back to Courses
                  </button>
                </div>
              </>
            )}

            {/* Error State */}
            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Payment Error
                </h2>
                <p className="text-gray-600 mb-4">
                  {error || 'An error occurred while processing your payment'}
                </p>
                <button
                  onClick={handleGoHome}
                  className="btn-primary"
                >
                  Back to Courses
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
