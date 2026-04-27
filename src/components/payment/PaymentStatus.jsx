import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, normalizeApiError, createNormalizedError, ERROR_TYPES } from '../../lib/api.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import Skeleton from '../ui/Skeleton.jsx'
import ErrorState from '../ui/ErrorState.jsx'

const steps = ['Initiated', 'Verifying', 'Completed']

export default function PaymentStatus() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const txRef = searchParams.get('tx_ref')
  const [status, setStatus] = useState('loading')
  const [paymentData, setPaymentData] = useState(null)
  const [error, setError] = useState('')

  const currentStep = status === 'loading' ? 1 : status === 'success' ? 2 : 1

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
        setTimeout(() => navigate(data.course_id ? `/course/${data.course_id}` : '/'), 2500)
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
    let checks = 0
    const interval = setInterval(async () => {
      try {
        const data = await api.get(`/payment-status?tx_ref=${txRef}`)
        setPaymentData(data)
        checks += 1
        if (data.status === 'paid') {
          clearInterval(interval)
          setStatus('success')
        } else if (data.status === 'failed' || data.status === 'cancelled' || checks >= 12) {
          clearInterval(interval)
          setStatus('failed')
          setError(createNormalizedError({ type: ERROR_TYPES.GENERIC_FAILURE, message: 'Payment verification timed out' }).message)
        }
      } catch {}
    }, 5000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-4">
      <Card className="w-full max-w-md rounded-2xl p-6 shadow-card" role="status" aria-live="polite">
        <div className="mb-5 flex items-center justify-between gap-2" aria-label="Payment progress" role="list">
          {steps.map((step, index) => (
            <div key={step} className="flex flex-1 items-center gap-2" role="listitem" aria-label={`${step} ${index <= currentStep ? 'complete' : 'pending'}`}>
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index <= currentStep ? 'bg-primary-600 text-white' : 'bg-surface-muted text-muted'}`}>{index + 1}</div>
              {index < steps.length - 1 && <div className={`h-0.5 flex-1 ${index < currentStep ? 'bg-primary-400' : 'bg-border-subtle'}`} />}
            </div>
          ))}
        </div>

        {status === 'loading' && (
          <div className="space-y-3 text-center">
            <Skeleton className="h-16 w-full" />
            <p className="text-sm text-secondary">Verifying your transaction…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3 text-center">
            <Badge variant="success" className="mx-auto">Payment Successful</Badge>
            <h1 className="text-2xl font-bold text-primary">Enrollment confirmed</h1>
            <p className="text-sm text-secondary">You will be redirected to your course in a moment.</p>
            <Button className="h-12 w-full" onClick={() => navigate(paymentData?.course_id ? `/course/${paymentData.course_id}` : '/')}>Go to course now</Button>
          </div>
        )}

        {status === 'failed' && (
          <ErrorState
            title="We couldn't confirm payment"
            message={error || 'Your payment could not be completed'}
            actionLabel="Try again"
            onAction={() => navigate('/')}
            className="border-none bg-transparent p-0 shadow-none"
          />
        )}

        {status === 'error' && (
          <ErrorState
            title="Payment Error"
            message={error}
            actionLabel="Back to courses"
            onAction={() => navigate('/')}
            className="border-none bg-transparent p-0 shadow-none"
          />
        )}

        {paymentData && <p className="mt-5 text-center text-xs text-muted">Transaction ID: {txRef}</p>}
      </Card>
    </div>
  )
}
