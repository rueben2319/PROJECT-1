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
    
    // Only allow digits
    const numericValue = value.replace(/\D/g, '')
    
    if (numericValue.length > 1) {
      // Handle paste
      const digits = numericValue.slice(0, length - index)
      const newOtp = [...otp]
      for (let i = 0; i < digits.length && index + i < length; i++) {
        newOtp[index + i] = digits[i]
      }
      setOtp(newOtp)
      
      // Focus the next empty input
      const nextEmptyIndex = newOtp.findIndex((digit, i) => i >= index && !digit)
      if (nextEmptyIndex !== -1 && nextEmptyIndex < length) {
        inputRefs.current[nextEmptyIndex]?.focus()
      } else if (newOtp.every(digit => digit)) {
        onComplete?.(newOtp.join(''))
      }
    } else {
      // Handle single digit input
      const newOtp = [...otp]
      newOtp[index] = numericValue
      setOtp(newOtp)
      
      if (numericValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      } else if (newOtp.every(digit => digit)) {
        onComplete?.(newOtp.join(''))
      }
    }
  }

  const handleKeyDown = (index, e) => {
    if (disabled) return
    
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    if (disabled) return
    
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '')
    if (pastedData) {
      handleChange(0, pastedData)
    }
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
    <div className="w-full max-w-sm mx-auto">
      <div className="flex justify-center gap-2 mb-6">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={ref => inputRefs.current[index] = ref}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:border-primary-600 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>
      
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={clearOTP}
          disabled={disabled || !otp.some(digit => digit)}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Clear code
        </button>
        
        {onResend && (
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || disabled}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {cooldown > 0 
              ? `Resend code in ${cooldown}s` 
              : "Didn't receive the code? Resend"
            }
          </button>
        )}
      </div>
    </div>
  )
}
