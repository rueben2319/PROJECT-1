import React from 'react'
import { cn } from '../../lib/cn.js'

const tones = {
  default: 'bg-surface text-primary border border-border-subtle shadow-card',
  dark: 'bg-surface-elevated text-primary-inverse border border-border-inverse',
  subtle: 'bg-surface-muted text-primary border border-border-subtle'
}

export default function Card({ className = '', tone = 'default', children }) {
  return <div className={cn('rounded-lg p-6', tones[tone], className)}>{children}</div>
}
