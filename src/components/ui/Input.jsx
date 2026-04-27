import React from 'react'
import { cn } from '../../lib/cn.js'

export default function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-secondary">{label}</label>}
      <input
        className={cn(
          'w-full h-11 rounded-md border border-border-default bg-surface px-3 text-primary placeholder:text-muted shadow-sm transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500',
          error && 'border-danger focus:ring-danger-200',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  )
}
