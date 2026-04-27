import React, { useId } from 'react'
import { cn } from '../../lib/cn.js'

export default function Input({ label, error, hint, className = '', id: idProp, required = false, ...props }) {
  const generatedId = useId()
  const inputId = idProp || `field-${generatedId}`
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-secondary">
          {label}
          {required ? <span className="ml-1 text-danger" aria-hidden="true">*</span> : null}
        </label>
      )}
      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={[errorId, !error ? hintId : null].filter(Boolean).join(' ') || undefined}
        className={cn(
          'w-full h-11 rounded-md border border-border-default bg-surface px-3 text-primary placeholder:text-muted shadow-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:border-primary-600',
          error && 'border-danger focus-visible:ring-danger-200',
          className
        )}
        {...props}
      />
      {error && <p id={errorId} className="text-sm text-danger">{error}</p>}
      {!error && hint && <p id={hintId} className="text-sm text-muted">{hint}</p>}
    </div>
  )
}
