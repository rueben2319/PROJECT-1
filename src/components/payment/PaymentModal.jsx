import React, { useState, useEffect, useRef } from 'react'
import { api, normalizeApiError, createNormalizedError, ERROR_TYPES } from '../../lib/api.jsx'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Skeleton from '../ui/Skeleton.jsx'

export default function PaymentModal({ course, onClose, onSuccess }) {
  const [state, setState] = useState('idle')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const pollIntervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const { price_mwk, title } = course

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
        } else if (data.status === 'failed' || data.status === 'cancelled' || pollCount >= 11) {
          clearTimers()
          setState('failed')
          setError('Payment was cancelled, failed, or timed out. Please try again.')
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
      <p className="mb-4 text-secondary">{title}</p>
      {state === 'idle' && (
        <div className="space-y-5">
          <Card tone="subtle" className="text-center">
            <div className="text-3xl font-bold text-primary-600">MWK {price_mwk.toLocaleString()}</div>
            <p className="text-sm text-secondary">One-time payment</p>
          </Card>
          <Input label="Mobile Money Number" value={phoneNumber} onChange={(e) => { setPhoneNumber(formatPhoneNumber(e.target.value)); setError('') }} error={error} hint="Airtel Money or TNM Mpamba" maxLength={12} placeholder="088 123 4567" />
          <div className="flex items-center justify-center gap-3"><Badge variant="danger">Airtel Money</Badge><Badge variant="primary">TNM Mpamba</Badge></div>
          <div className="space-y-2">
            <Button onClick={createPayment} className="w-full" disabled={!validatePhoneNumber(phoneNumber.replace(/\s/g, ''))}>Pay MWK {price_mwk.toLocaleString()}</Button>
            <Button onClick={handleClose} variant="ghost" className="w-full">Cancel</Button>
          </div>
        </div>
      )}
      {state === 'loading' && <Skeleton className="h-24 w-full" />}
      {state === 'polling' && <p className="text-center text-secondary">Check your phone... polling ({pollCount})</p>}
      {state === 'success' && <div className="space-y-3 text-center"><Badge variant="success">Payment successful</Badge><Button className="w-full" onClick={handleClose}>Start Learning</Button></div>}
      {state === 'failed' && <div className="space-y-3"><p className="text-danger">{error}</p><Button className="w-full" onClick={() => setState('idle')}>Try Again</Button></div>}
    </Modal>
  )
}
