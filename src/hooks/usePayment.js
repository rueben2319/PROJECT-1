import { useState } from 'react'
import { api, normalizeApiError, createNormalizedError, ERROR_TYPES } from '../lib/api.jsx'

export function usePayment() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Initiate payment for a course
   */
  const handlePay = async (courseId, phoneNumber) => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.post('/create-payment', {
        course_id: courseId,
        phone_number: phoneNumber
      })

      if (response.payment_url) {
        // Open payment URL in new window
        const paymentWindow = window.open(response.payment_url, '_blank', 'width=400,height=600')
        
        // Start polling for payment status
        const paymentResult = await pollStatus(response.tx_ref)
        
        // Close payment window if still open
        if (paymentWindow && !paymentWindow.closed) {
          paymentWindow.close()
        }

        return paymentResult
      }

      return response

    } catch (err) {
      setError(normalizeApiError(err))
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * Poll payment status until completion/timeout
   */
  const pollStatus = async (txRef, timeoutMs = 60000) => {
    const startTime = Date.now()
    const pollInterval = 5000 // 5 seconds

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await api.get(`/payment-status?tx_ref=${txRef}`)
          
          if (response.status === 'paid') {
            // Emit success event for enrollment cache invalidation
            window.dispatchEvent(new CustomEvent('payment_success', {
              detail: {
                tx_ref: txRef,
                course_id: response.course?.id,
                amount: response.amount_mwk
              }
            }))
            
            resolve({
              success: true,
              status: 'paid',
              data: response
            })
          } else if (response.status === 'failed' || response.status === 'cancelled') {
            resolve({
              success: false,
              status: response.status,
              data: response
            })
          } else if (Date.now() - startTime >= timeoutMs) {
            reject(createNormalizedError({ type: ERROR_TYPES.GENERIC_FAILURE, details: 'payment_timeout', message: 'Payment verification timed out' }))
          } else {
            // Continue polling
            setTimeout(poll, pollInterval)
          }
        } catch (err) {
          if (Date.now() - startTime >= timeoutMs) {
            reject(createNormalizedError({ type: ERROR_TYPES.GENERIC_FAILURE, details: 'payment_timeout', message: 'Payment verification timed out' }))
          } else {
            // Continue polling on network errors
            setTimeout(poll, pollInterval)
          }
        }
      }

      // Start polling
      poll()
    })
  }

  /**
   * Get payment status (single check)
   */
  const getStatus = async (txRef) => {
    try {
      const response = await api.get(`/payment-status?tx_ref=${txRef}`)
      return response
    } catch (err) {
      setError(normalizeApiError(err))
      throw err
    }
  }

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null)
  }

  return {
    handlePay,
    pollStatus,
    getStatus,
    loading,
    error,
    clearError
  }
}

/**
 * Custom hook for payment polling with React state
 */
export function usePaymentPoll(txRef, onSuccess, onFailure, timeoutMs = 60000) {
  const [status, setStatus] = useState('loading')
  const [paymentData, setPaymentData] = useState(null)
  const [error, setError] = useState(null)

  React.useEffect(() => {
    if (!txRef) return

    let pollInterval
    let timeoutId
    const startTime = Date.now()

    const poll = async () => {
      try {
        const token = localStorage.getItem('sb-access-token')
        const response = await fetch(`/api/payment-status?tx_ref=${txRef}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to check payment status')
        }

        const data = await response.json()
        setPaymentData(data)

        if (data.status === 'paid') {
          setStatus('success')
          clearInterval(pollInterval)
          clearTimeout(timeoutId)
          onSuccess(data)
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setStatus('failed')
          clearInterval(pollInterval)
          clearTimeout(timeoutId)
          onFailure(data)
        } else if (Date.now() - startTime >= timeoutMs) {
          setStatus('timeout')
          clearInterval(pollInterval)
          clearTimeout(timeoutId)
          setError('Payment verification timed out')
          onFailure({ error: 'timeout' })
        }

      } catch (err) {
        console.error('Polling error:', err)
        // Continue polling on network errors unless timeout
        if (Date.now() - startTime >= timeoutMs) {
          setStatus('error')
          clearInterval(pollInterval)
          clearTimeout(timeoutId)
          setError('Payment verification failed')
          onFailure({ error: 'network_error' })
        }
      }
    }

    // Start polling
    poll()
    pollInterval = setInterval(poll, 5000)

    // Set timeout
    timeoutId = setTimeout(() => {
      clearInterval(pollInterval)
      setStatus('timeout')
      setError('Payment verification timed out')
      onFailure({ error: 'timeout' })
    }, timeoutMs)

    // Cleanup
    return () => {
      clearInterval(pollInterval)
      clearTimeout(timeoutId)
    }
  }, [txRef, onSuccess, onFailure, timeoutMs])

  return {
    status,
    paymentData,
    error,
    reset: () => {
      setStatus('loading')
      setPaymentData(null)
      setError(null)
    }
  }
}
