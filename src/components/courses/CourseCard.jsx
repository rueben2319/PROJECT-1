import React from 'react'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'

export default function CourseCard({ course, onUnlock }) {
  const { id, title, subject, grade, lesson_count, price_mwk, preview_available, is_enrolled, days_remaining } = course
  const isExpired = is_enrolled && days_remaining <= 0
  const enrollmentState = isExpired ? 'expired' : is_enrolled ? 'active' : 'locked'

  const chip = {
    active: { label: `${days_remaining} days left`, variant: 'success' },
    expired: { label: 'Expired', variant: 'danger' },
    locked: { label: 'Not enrolled', variant: 'warning' }
  }[enrollmentState]

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle p-0 shadow-card transition-all duration-fast hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="info">{subject}</Badge>
            <h3 className="mt-2 text-lg font-bold leading-tight text-primary">{title}</h3>
          </div>
          <Badge variant="primary">{grade}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-secondary">
          <span>📹</span>
          <span>{lesson_count} lessons</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={chip.variant} className="font-semibold">{chip.label}</Badge>
          {preview_available && !is_enrolled && <Badge variant="info">Preview lessons</Badge>}
        </div>
      </div>

      <div className="mt-auto border-t border-border-subtle bg-surface-muted/60 p-4">
        {is_enrolled && !isExpired ? (
          <Button className="w-full" onClick={() => (window.location.href = `/course/${id}`)}>Continue course</Button>
        ) : (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted">One-time access</p>
              <p className="text-2xl font-bold text-primary-700">MWK {price_mwk.toLocaleString()}</p>
            </div>
            <Button onClick={() => onUnlock(course)} className="w-full">{isExpired ? 'Renew enrollment' : 'Unlock course'}</Button>
          </div>
        )}
      </div>
    </Card>
  )
}
