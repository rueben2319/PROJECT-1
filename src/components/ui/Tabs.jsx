import React from 'react'
import { cn } from '../../lib/cn.js'

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="inline-flex rounded-md bg-surface-muted p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors duration-fast',
            active === tab ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
