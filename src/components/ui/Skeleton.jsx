import React from 'react'
import { cn } from '../../lib/cn.js'

export default function Skeleton({ className = '' }) {
  return <div className={cn('animate-pulse motion-reduce:animate-none rounded-md bg-surface-muted', className)} aria-hidden="true" />
}
