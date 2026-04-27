import React, { forwardRef } from 'react'
import { cn } from '../../lib/cn.js'

const tones = {
  default: 'bg-surface text-primary border border-border-subtle shadow-card',
  dark: 'bg-surface-elevated text-primary-inverse border border-border-inverse',
  subtle: 'bg-surface-muted text-primary border border-border-subtle'
}

const Card = forwardRef(function Card({ className = '', tone = 'default', children, ...props }, ref) {
  return <div ref={ref} className={cn('rounded-lg p-6', tones[tone], className)} {...props}>{children}</div>
})

export default Card
