import React from 'react'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'

export default function LessonRow({ video, isEnrolled, isPreview, completed, onPlay, onUnlock }) {
  const { title, lesson_number, duration_seconds } = video
  const canPlay = isPreview || isEnrolled
  const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`

  const stateLabel = completed
    ? { label: 'Completed', variant: 'success', icon: '✅' }
    : isPreview
      ? { label: 'Preview', variant: 'info', icon: '👀' }
      : canPlay
        ? { label: 'Ready', variant: 'primary', icon: '▶️' }
        : { label: 'Locked', variant: 'warning', icon: '🔒' }

  return (
    <Card
      tone="subtle"
      className={`flex items-center justify-between gap-3 rounded-xl border border-border-subtle p-4 transition-colors ${canPlay ? 'cursor-pointer hover:bg-surface' : 'opacity-90'}`}
      onClick={() => (canPlay ? onPlay(video) : onUnlock(video))}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <span>Lesson {lesson_number}</span>
          <span>•</span>
          <span>{formatDuration(duration_seconds)}</span>
        </div>
        <h3 className="truncate text-sm font-semibold text-primary sm:text-base">{title}</h3>
      </div>
      <Badge variant={stateLabel.variant} className="shrink-0 font-semibold">{stateLabel.icon} {stateLabel.label}</Badge>
    </Card>
  )
}
