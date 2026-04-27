import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, normalizeApiError, createNormalizedError, ERROR_TYPES } from '../../lib/api.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import Skeleton from '../ui/Skeleton.jsx'

export default function PaymentStatus() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const txRef = searchParams.get('tx_ref')
  const [status, setStatus] = useState('loading')
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
      const data = await api.get(`/payment-status?tx_ref=${txRef}`)
      setPaymentData(data)
      if (data.status === 'paid') {
        setStatus('success')
        setTimeout(() => navigate(data.course_id ? `/course/${data.course_id}` : '/'), 3000)
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        setStatus('failed')
      } else {
        startPolling()
      }
    } catch (err) {
      setError(normalizeApiError(err).message)
      setStatus('error')
    }
  }

  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        const data = await api.get(`/payment-status?tx_ref=${txRef}`)
        setPaymentData(data)
        setPollCount((prev) => prev + 1)
        if (data.status === 'paid') {
          clearInterval(interval)
          setStatus('success')
        } else if (data.status === 'failed' || data.status === 'cancelled' || pollCount >= 12) {
          clearInterval(interval)
          setStatus('failed')
          setError(createNormalizedError({ type: ERROR_TYPES.GENERIC_FAILURE, message: 'Payment verification timed out' }).message)
        }
      } catch {}
    }, 5000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-4">
      <Card className="w-full max-w-md text-center">
        {status === 'loading' && <Skeleton className="h-24 w-full" />}
        {status === 'success' && <><Badge variant="success">Payment Successful</Badge><p className="mt-3 text-secondary">Redirecting to your course...</p></>}
        {status === 'failed' && <><Badge variant="danger">Payment Failed</Badge><p className="mt-3 text-danger">{error || 'Your payment could not be completed'}</p><div className="mt-4 space-y-2"><Button className="w-full" onClick={() => navigate('/')}>Try Again</Button><Button variant="ghost" className="w-full" onClick={() => navigate('/')}>Back to Courses</Button></div></>}
        {status === 'error' && <><Badge variant="warning">Payment Error</Badge><p className="mt-3 text-danger">{error}</p><Button className="mt-4 w-full" onClick={() => navigate('/')}>Back to Courses</Button></>}
        {paymentData && <p className="mt-4 text-xs text-muted">Transaction ID: {txRef}</p>}
      </Card>
    </div>
  )
}
