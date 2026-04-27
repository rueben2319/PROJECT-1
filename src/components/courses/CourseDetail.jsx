import React from 'react'
import LessonRow from './LessonRow.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'

export default function CourseDetail({ course, videos = [], isEnrolled, expiresAt, daysRemaining, onUnlock, onPlayLesson }) {
  const { title, subject, grade, description, price_mwk, lesson_count } = course
  const isExpired = isEnrolled && daysRemaining <= 0
  const completedCount = videos.filter((v) => v.completed).length
  const progress = lesson_count > 0 ? Math.round((completedCount / lesson_count) * 100) : 0

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-28">
      <Card className="rounded-2xl border border-border-subtle shadow-card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="info">{subject}</Badge>
          <Badge variant="primary">{grade}</Badge>
          {isEnrolled && !isExpired && <Badge variant="success">Enrolled</Badge>}
          {isExpired && <Badge variant="danger">Access expired</Badge>}
        </div>

        <h1 className="text-3xl font-bold text-primary">{title}</h1>
        <p className="mt-3 text-secondary">{description}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card tone="subtle" className="rounded-xl p-4">
            <p className="text-2xl font-bold text-primary">{lesson_count}</p>
            <p className="text-sm text-secondary">Lessons</p>
          </Card>
          <Card tone="subtle" className="rounded-xl p-4">
            <p className="text-2xl font-bold text-primary">{completedCount}</p>
            <p className="text-sm text-secondary">Completed</p>
          </Card>
          <Card tone="subtle" className="rounded-xl p-4">
            <p className="text-2xl font-bold text-primary">{progress}%</p>
            <p className="text-sm text-secondary">Progress</p>
          </Card>
          <Card tone="subtle" className="rounded-xl p-4">
            <p className="text-lg font-bold text-primary">{isEnrolled && !isExpired ? `${daysRemaining}d` : '—'}</p>
            <p className="text-sm text-secondary">Days left</p>
          </Card>
        </div>

        {isEnrolled && !isExpired && (
          <p className="mt-4 text-sm text-secondary">Access valid until {new Date(expiresAt).toLocaleDateString()}.</p>
        )}
      </Card>

      <Card className="rounded-2xl border border-border-subtle shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary">Course Lessons</h2>
          <Badge variant="default">{videos.length} total</Badge>
        </div>
        <div className="space-y-3">
          {videos.map((video) => (
            <LessonRow
              key={video.id}
              video={video}
              isEnrolled={isEnrolled && !isExpired}
              isPreview={video.is_preview}
              completed={video.completed}
              onPlay={onPlayLesson}
              onUnlock={() => onUnlock(course)}
            />
          ))}
        </div>
      </Card>

      {(!isEnrolled || isExpired) && (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border-subtle bg-surface/95 px-4 pb-4 pt-3 backdrop-blur sm:bottom-0">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">{isExpired ? 'Renew to continue' : 'Unlock full course'}</p>
              <p className="text-xl font-bold text-primary-700">MWK {price_mwk.toLocaleString()}</p>
            </div>
            <Button className="h-12 min-w-[170px]" onClick={() => onUnlock(course)}>{isExpired ? 'Renew access' : 'Enroll now'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
