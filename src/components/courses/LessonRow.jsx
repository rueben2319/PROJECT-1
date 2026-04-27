import React from 'react'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'

export default function LessonRow({ video, isEnrolled, isPreview, completed, onPlay, onUnlock }) {
  const { title, lesson_number, duration_seconds } = video
  const canPlay = isPreview || isEnrolled
  const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`

  return (
    <Card tone="subtle" className={`flex items-center justify-between p-4 ${canPlay ? 'cursor-pointer hover:bg-surface' : 'opacity-80'}`}>
      <div onClick={() => (canPlay ? onPlay(video) : onUnlock(video))}>
        <h3 className="font-semibold text-primary">Lesson {lesson_number}: {title}</h3>
        <p className="text-sm text-secondary">{formatDuration(duration_seconds)}</p>
      </div>
      <div className="flex items-center gap-2">
        {completed && <Badge variant="success">Completed</Badge>}
        {isPreview && <Badge variant="info">Preview</Badge>}
        {!canPlay && <Badge variant="warning">Locked</Badge>}
      </div>
    </Card>
  )
}
