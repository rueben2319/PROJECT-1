import React, { useState, useRef, useEffect } from 'react'

export default function OTPInput({ length = 6, onComplete, onResend, disabled = false }) {
  const [otp, setOtp] = useState(new Array(length).fill(''))
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef([])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleChange = (index, value) => {
    if (disabled) return
    const numericValue = value.replace(/\D/g, '')

    if (numericValue.length > 1) {
      const digits = numericValue.slice(0, length - index)
      const newOtp = [...otp]
      for (let i = 0; i < digits.length && index + i < length; i++) newOtp[index + i] = digits[i]
      setOtp(newOtp)

      const nextEmptyIndex = newOtp.findIndex((digit, i) => i >= index && !digit)
      if (nextEmptyIndex !== -1 && nextEmptyIndex < length) inputRefs.current[nextEmptyIndex]?.focus()
      else if (newOtp.every((digit) => digit)) onComplete?.(newOtp.join(''))
      return
    }

    const newOtp = [...otp]
    newOtp[index] = numericValue
    setOtp(newOtp)

    if (numericValue && index < length - 1) inputRefs.current[index + 1]?.focus()
    else if (newOtp.every((digit) => digit)) onComplete?.(newOtp.join(''))
  }

  const handleKeyDown = (index, e) => {
    if (disabled) return

    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus()
    else if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    else if (e.key === 'ArrowRight' && index < length - 1) inputRefs.current[index + 1]?.focus()
  }

  const handlePaste = (e) => {
    if (disabled) return
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '')
    if (pastedData) handleChange(0, pastedData)
  }

  const handleResend = () => {
    if (cooldown === 0 && onResend) {
      onResend()
      setCooldown(60)
    }
  }

  const clearOTP = () => {
    setOtp(new Array(length).fill(''))
    inputRefs.current[0]?.focus()
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-2 text-center text-xs uppercase tracking-wide text-muted">Verification code</div>
      <div className="mb-6 flex justify-center gap-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            className="h-12 w-12 rounded-lg border-2 border-border-default text-center text-lg font-semibold transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:bg-surface-subtle"
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 text-sm">
        <button type="button" onClick={clearOTP} disabled={disabled || !otp.some((digit) => digit)} className="text-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:text-gray-300">Clear code</button>

        {onResend && (
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || disabled}
            className="font-medium text-primary-600 transition-colors hover:text-primary-700 disabled:cursor-not-allowed disabled:text-muted"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive the code? Resend"}
          </button>
        )}
      </div>
    </div>
  )
}
