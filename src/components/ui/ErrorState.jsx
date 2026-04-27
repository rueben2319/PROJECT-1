import React from 'react'
import Card from './Card.jsx'
import Button from './Button.jsx'

export default function ErrorState({
  title = 'Something went wrong',
  message,
  actionLabel = 'Try again',
  onAction,
  className = ''
}) {
  return (
    <Card className={`space-y-3 text-center ${className}`.trim()} role="alert" aria-live="assertive">
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      {message ? <p className="text-sm text-danger">{message}</p> : null}
      {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </Card>
  )
}
