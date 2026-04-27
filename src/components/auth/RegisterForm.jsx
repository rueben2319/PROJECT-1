import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.jsx'
import { normalizeAuthError } from '../../lib/api.jsx'
import OTPInput from './OTPInput.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Card from '../ui/Card.jsx'
import Toast from '../ui/Toast.jsx'

export default function RegisterForm() {
  const [step, setStep] = useState('form')
  const [formData, setFormData] = useState({ fullName: '', phone: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const navigate = useNavigate()

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validatePhone = (phone) => /^(?:\+265|0)?[9]\d{8}$/.test(phone.replace(/\s/g, ''))

  const validateForm = () => {
    const newErrors = {}
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    else if (!validatePhone(formData.phone)) newErrors.phone = 'Please enter a valid Malawi phone number (08x or 09x)'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Please enter a valid email address'
    if (!formData.password || formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setErrors({})

    try {
      const normalizedPhone = formData.phone.replace(/\s/g, '').replace(/^0/, '+265')
      const { data, error } = await supabase.auth.signUp({
        email: formData.email || `${normalizedPhone}@msce-learn.com`,
        password: formData.password,
        options: { data: { full_name: formData.fullName, phone: normalizedPhone, email: formData.email || null } }
      })
      if (error) return setErrors({ submit: normalizeAuthError(error).message })
      if (data.user) {
        setUserId(data.user.id)
        setStep('otp')
      }
    } catch {
      setErrors({ submit: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleOTPComplete = async (otp) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ token: otp, type: 'signup' })
      if (error) return setErrors({ otp: 'Invalid verification code. Please try again.' })
      if (userId) {
        await supabase.from('profiles').update({ full_name: formData.fullName, phone: formData.phone.replace(/\s/g, '').replace(/^0/, '+265'), email: formData.email || null }).eq('id', userId)
      }
      navigate('/dashboard')
    } catch {
      setErrors({ otp: 'Verification failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!userId) return
    await supabase.auth.resend({ type: 'signup', email: formData.email || `${formData.phone.replace(/\s/g, '').replace(/^0/, '+265')}@msce-learn.com` })
  }

  if (step === 'otp') {
    return (
      <Card className="mx-auto w-full max-w-md">
        <h2 className="mb-2 text-2xl font-bold text-primary">Verify your account</h2>
        <p className="mb-6 text-secondary">We sent a 6-digit code to {formData.email || formData.phone}</p>
        <Toast message={errors.otp} tone="danger" className="mb-4" />
        <OTPInput onComplete={handleOTPComplete} onResend={handleResendOTP} disabled={loading} />
        <Button variant="ghost" className="mt-6 w-full" onClick={() => setStep('form')} disabled={loading}>← Back to registration</Button>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <h1 className="mb-2 text-3xl font-bold text-primary">Join MSCE Learn</h1>
      <p className="mb-8 text-secondary">Start your learning journey today</p>
      <Toast message={errors.submit} tone="danger" className="mb-4" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full Name" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} error={errors.fullName} />
        <Input label="Phone Number" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} error={errors.phone} />
        <Input label="Email (optional)" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} error={errors.email} />
        <Input label="Password" type="password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} error={errors.password} />
        <Input label="Confirm Password" type="password" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} error={errors.confirmPassword} />
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</Button>
      </form>
      <p className="mt-6 text-center text-secondary">Already have an account? <Link to="/login" className="text-primary-600">Sign in</Link></p>
    </Card>
  )
}
