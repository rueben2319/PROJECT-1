import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.jsx'
import { normalizeAuthError } from '../../lib/api.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Card from '../ui/Card.jsx'
import Toast from '../ui/Toast.jsx'

function IconField({ icon, children }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-[2.3rem] text-base text-muted">{icon}</span>
      {children}
    </div>
  )
}

export default function ForgotPassword() {
  const [step, setStep] = useState('form')
  const [formData, setFormData] = useState({ identifier: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleInputChange = (value) => {
    setFormData({ identifier: value })
    if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    const clean = formData.identifier.trim().replace(/\s/g, '')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^(?:\+265|0)?[9]\d{8}$/
    if (!clean) newErrors.identifier = 'Phone number or email is required'
    else if (!emailRegex.test(clean) && !phoneRegex.test(clean)) newErrors.identifier = 'Please enter a valid email or phone number'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setErrors({})

    try {
      let email = formData.identifier
      const phoneRegex = /^(?:\+265|0)?[9]\d{8}$/
      if (phoneRegex.test(formData.identifier.replace(/\s/g, ''))) {
        email = `${formData.identifier.replace(/\s/g, '').replace(/^0/, '+265')}@msce-learn.com`
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
      if (error) {
        setErrors({ submit: normalizeAuthError(error).message })
        return
      }
      setStep('success')
    } catch {
      setErrors({ submit: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <Card className="mx-auto w-full max-w-md rounded-2xl p-7 text-center shadow-card">
        <h2 className="mb-2 text-2xl font-bold text-primary">Reset Link Sent</h2>
        <p className="mb-6 text-sm text-secondary">We sent reset instructions to {formData.identifier}.</p>
        <div className="space-y-3">
          <Link to="/login"><Button className="h-12 w-full">Back to Sign In</Button></Link>
          <Button variant="ghost" className="w-full" onClick={() => setStep('form')}>Send to different email/phone</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-md rounded-2xl p-7 shadow-card">
      <h1 className="mb-2 text-3xl font-bold text-primary">Reset Password</h1>
      <p className="mb-8 text-sm text-secondary">Enter your phone or email to receive a reset link</p>
      <Toast message={errors.submit} tone="danger" className="mb-4" />
      <form onSubmit={handleSubmit} className="space-y-5" aria-label="Reset password form">
        <IconField icon="📨">
          <Input
            label="Phone Number or Email"
            name="identifier"
            autoComplete="username"
            value={formData.identifier}
            onChange={(e) => handleInputChange(e.target.value)}
            error={errors.identifier}
            hint="We'll send a secure password reset link"
            disabled={loading}
            className="pl-10"
            placeholder="088 123 4567 or your.email@example.com"
          />
        </IconField>
        <Button type="submit" disabled={loading} className="h-12 w-full">{loading ? 'Sending reset link...' : 'Send Reset Link'}</Button>
      </form>
      <div className="mt-6 text-center"><Link to="/login" className="text-sm font-semibold text-primary-600">← Back to Sign In</Link></div>
    </Card>
  )
}
