import React from 'react'
import { cn } from '../../lib/cn.js'

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-300',
  secondary: 'bg-surface-muted text-primary hover:bg-surface-subtle focus-visible:ring-primary-300',
  ghost: 'bg-transparent text-primary hover:bg-surface-subtle focus-visible:ring-primary-300',
  outline: 'border border-border-default bg-surface text-primary hover:bg-surface-subtle focus-visible:ring-primary-300',
  danger: 'bg-danger text-white hover:bg-danger-700 focus-visible:ring-danger-200'
}

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base'
}

export default function Button({ className = '', variant = 'primary', size = 'md', ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
