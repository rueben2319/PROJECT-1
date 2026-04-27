import React from 'react'
import { cn } from '../../lib/cn.js'

const variants = {
  default: 'bg-surface-muted text-secondary',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  primary: 'bg-primary-100 text-primary-700',
  info: 'bg-accent-100 text-accent-700'
}

export default function Badge({ className = '', variant = 'default', children }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', variants[variant], className)}>{children}</span>
}
