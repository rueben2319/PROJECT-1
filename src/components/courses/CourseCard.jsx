import React from 'react'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'

export default function CourseCard({ course, onUnlock }) {
  const { id, title, subject, grade, lesson_count, price_mwk, preview_available, is_enrolled, days_remaining } = course
  const isExpired = is_enrolled && days_remaining <= 0

  return (
    <Card className={`relative overflow-hidden transition-shadow duration-fast hover:shadow-card-hover ${is_enrolled && !isExpired ? 'cursor-pointer' : ''}`}>
      {!is_enrolled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">MWK {price_mwk.toLocaleString()}</div>
            <Button onClick={() => onUnlock(course)} size="sm" className="mt-3">Unlock Course</Button>
          </div>
        </div>
      )}
      <div onClick={() => is_enrolled && !isExpired && (window.location.href = `/course/${id}`)}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <Badge variant="info">{subject}</Badge>
            <h3 className="mt-2 text-lg font-bold text-primary">{title}</h3>
          </div>
          <Badge variant="primary">{grade}</Badge>
        </div>
        <div className="mb-4 text-sm text-secondary">{lesson_count} lessons</div>
        <div className="flex flex-wrap gap-2">
          {is_enrolled && !isExpired && <Badge variant="success">Enrolled — {days_remaining} days left</Badge>}
          {isExpired && <Badge variant="danger">Access expired</Badge>}
          {preview_available && !is_enrolled && <Badge>Preview available</Badge>}
        </div>
      </div>
    </Card>
  )
}
