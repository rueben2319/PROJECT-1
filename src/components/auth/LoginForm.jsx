import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.jsx'
import { normalizeAuthError, ERROR_TYPES } from '../../lib/api.jsx'
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

export default function LoginForm() {
  const [formData, setFormData] = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validateForm = () => {
    const nextErrors = {}
    if (!formData.identifier.trim()) nextErrors.identifier = 'Phone number or email is required'
    if (!formData.password) nextErrors.password = 'Password is required'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
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
        const normalizedPhone = formData.identifier.replace(/\s/g, '').replace(/^0/, '+265')
        email = `${normalizedPhone}@msce-learn.com`
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password: formData.password })
      if (error) {
        const normalized = normalizeAuthError(error)
        setErrors({ submit: normalized.type === ERROR_TYPES.UNAUTHORIZED ? 'Invalid phone/email or password' : normalized.message })
        return
      }
      if (data.user) navigate('/dashboard')
    } catch {
      setErrors({ submit: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md rounded-2xl p-7 shadow-card">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">Welcome Back</h1>
        <p className="mt-1 text-sm text-secondary">Sign in to continue learning</p>
      </div>
      <Toast message={errors.submit} tone="danger" className="mb-4" />
      <form onSubmit={handleSubmit} className="space-y-5" aria-label="Sign in form">
        <IconField icon="👤">
          <Input
            label="Phone Number or Email"
            name="identifier"
            autoComplete="username"
            value={formData.identifier}
            onChange={(e) => handleInputChange('identifier', e.target.value)}
            error={errors.identifier}
            hint="Use your registered phone or email"
            disabled={loading}
            className="pl-10"
            placeholder="088 123 4567 or your.email@example.com"
          />
        </IconField>
        <IconField icon="🔒">
          <Input
            label="Password"
            name="password"
            autoComplete="current-password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            error={errors.password}
            hint="Minimum 6 characters"
            disabled={loading}
            className="pl-10"
            placeholder="Enter your password"
          />
        </IconField>
        <div className="flex items-center justify-end text-sm">
          <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-700">Forgot password?</Link>
        </div>
        <Button type="submit" disabled={loading} className="h-12 w-full">{loading ? 'Signing in...' : 'Sign In'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-secondary">
        Don't have an account? <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">Create one</Link>
      </p>
    </Card>
  )
}
