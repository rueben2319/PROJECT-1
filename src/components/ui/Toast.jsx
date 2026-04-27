import React from 'react'
import { cn } from '../../lib/cn.js'

const toneMap = {
  success: 'bg-success-100 text-success-700 border-success-200',
  warning: 'bg-warning-100 text-warning-700 border-warning-200',
  danger: 'bg-danger-100 text-danger-700 border-danger-200',
  info: 'bg-surface-muted text-secondary border-border-subtle'
}

export default function Toast({ message, tone = 'info', className = '' }) {
  if (!message) return null
  return <div className={cn('rounded-md border px-4 py-3 text-sm', toneMap[tone], className)}>{message}</div>
}
