import React from 'react'
import Card from './Card.jsx'
import Button from './Button.jsx'

export default function EmptyState({
  title = 'Nothing to show yet',
  description,
  icon = '📭',
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <Card className={`py-12 text-center ${className}`.trim()}>
      <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-surface-muted text-2xl leading-[3rem]" aria-hidden="true">{icon}</div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-sm text-sm text-secondary">{description}</p> : null}
      {actionLabel && onAction ? <Button onClick={onAction} className="mt-4">{actionLabel}</Button> : null}
    </Card>
  )
}
