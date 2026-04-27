import React, { useState, useEffect, useRef } from 'react'
import { api, normalizeApiError, createNormalizedError, ERROR_TYPES } from '../../lib/api.jsx'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Skeleton from '../ui/Skeleton.jsx'
import ErrorState from '../ui/ErrorState.jsx'

const steps = ['Details', 'Confirming', 'Done']

export default function PaymentModal({ course, onClose, onSuccess }) {
  const [state, setState] = useState('idle')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const pollIntervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const { price_mwk, title } = course

  const currentStep = state === 'idle' ? 0 : state === 'loading' || state === 'polling' ? 1 : 2
  const validatePhoneNumber = (phone) => /^(08|09)\d{8}$/.test(phone.replace(/\s/g, ''))

  const formatPhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length <= 3) return cleanPhone
    if (cleanPhone.length <= 6) return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3)}`
    return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6, 10)}`
  }

  const clearTimers = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const handleClose = () => {
    clearTimers()
    onClose()
  }

  const startPolling = (paymentTxRef) => {
    setPollCount(0)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await api.get(`/payment-status?tx_ref=${paymentTxRef}`)
        setPollCount((prev) => prev + 1)
        if (data.status === 'paid') {
          clearTimers()
          setState('success')
          onSuccess()
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearTimers()
          setState('failed')
          setError('Payment was cancelled or failed. Please try again.')
        }
      } catch {
        // keep polling
      }
    }, 5000)

    timeoutRef.current = setTimeout(() => {
      clearTimers()
      setState('failed')
      setError(createNormalizedError({ type: ERROR_TYPES.GENERIC_FAILURE, message: 'Payment timed out. Please check your phone and try again.' }).message)
    }, 60000)
  }

  const createPayment = async () => {
    const cleanPhone = phoneNumber.replace(/\s/g, '')
    if (!validatePhoneNumber(cleanPhone)) return setError('Please enter a valid Malawi phone number (08x or 09x)')

    try {
      setState('loading')
      setError('')
      const data = await api.post('/create-payment', { course_id: course.id, phone_number: cleanPhone })
      if (data.payment_url) window.open(data.payment_url, '_blank')
      setState('polling')
      startPolling(data.tx_ref)
    } catch (err) {
      setError(normalizeApiError(err).message)
      setState('idle')
    }
  }

  useEffect(() => clearTimers, [])

  return (
    <Modal isOpen onClose={handleClose} title="Unlock Course">
      <div className="space-y-4 pb-2" role="status" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, index) => (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index <= currentStep ? 'bg-primary-600 text-white' : 'bg-surface-muted text-muted'}`}>{index + 1}</div>
              <span className={`text-xs ${index <= currentStep ? 'text-primary font-semibold' : 'text-muted'}`}>{step}</span>
              {index < steps.length - 1 && <div className={`h-0.5 flex-1 ${index < currentStep ? 'bg-primary-400' : 'bg-border-subtle'}`} />}
            </div>
          ))}
        </div>

        <p className="text-sm text-secondary">{title}</p>

        {(state === 'idle' || state === 'loading') && (
          <Card tone="subtle" className="rounded-xl text-center">
            <p className="text-xs uppercase tracking-wide text-muted">One-time payment</p>
            <div className="text-3xl font-bold text-primary-600">MWK {price_mwk.toLocaleString()}</div>
            <p className="text-sm text-secondary">Course unlocks instantly after confirmation.</p>
          </Card>
        )}

        {state === 'idle' && (
          <>
            <Input
              id="mobile-money-number"
              name="mobile-money-number"
              autoComplete="tel"
              label="Mobile Money Number"
              required
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(formatPhoneNumber(e.target.value))
                setError('')
              }}
              error={error}
              hint="Use Airtel Money or TNM Mpamba (example: 088 123 4567)"
              maxLength={12}
              placeholder="088 123 4567"
            />
            <div className="flex items-center justify-center gap-3"><Badge variant="danger">Airtel Money</Badge><Badge variant="primary">TNM Mpamba</Badge></div>
          </>
        )}

        {state === 'loading' && <Skeleton className="h-24 w-full" />}
        {state === 'polling' && (
          <Card tone="subtle" className="rounded-xl text-center">
            <p className="text-base font-semibold text-primary">Approve payment on your phone</p>
            <p className="mt-1 text-sm text-secondary">Waiting for network confirmation… check #{pollCount + 1}</p>
          </Card>
        )}

        {state === 'success' && (
          <Card tone="subtle" className="space-y-2 rounded-xl text-center">
            <Badge variant="success" className="mx-auto">Payment successful</Badge>
            <p className="text-sm text-secondary">You're all set. Your course is now unlocked.</p>
          </Card>
        )}

        {state === 'failed' && (
          <Card tone="subtle" className="space-y-2 rounded-xl text-center">
            <Badge variant="danger" className="mx-auto">Payment failed</Badge>
            <ErrorState title="Payment failed" message={error} actionLabel="Try payment again" onAction={() => setState('idle')} className="border-none bg-transparent p-0 shadow-none" />
          </Card>
        )}

        <div className="sticky bottom-0 -mx-1 border-t border-border-subtle bg-surface px-1 pt-3" aria-label="Payment actions">
          {state === 'idle' && (
            <div className="space-y-2">
              <Button onClick={createPayment} className="h-12 w-full" disabled={!validatePhoneNumber(phoneNumber.replace(/\s/g, ''))}>Pay MWK {price_mwk.toLocaleString()}</Button>
              <Button onClick={handleClose} variant="ghost" className="w-full">Cancel</Button>
            </div>
          )}

          {state === 'success' && <Button className="h-12 w-full" onClick={handleClose}>Start learning now</Button>}
          {state === 'failed' && (
            <div className="space-y-2">
              <Button className="h-12 w-full" onClick={() => setState('idle')}>Try payment again</Button>
              <Button className="w-full" variant="ghost" onClick={handleClose}>Close</Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
