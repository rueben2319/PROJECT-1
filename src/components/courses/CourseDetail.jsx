import React from 'react'
import LessonRow from './LessonRow.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'

export default function CourseDetail({ course, videos = [], isEnrolled, expiresAt, daysRemaining, onUnlock, onPlayLesson }) {
  const { title, subject, grade, description, price_mwk, lesson_count } = course
  const isExpired = isEnrolled && daysRemaining <= 0

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Card>
        <div className="mb-4 flex items-center gap-3"><Badge variant="info">{subject}</Badge><Badge variant="primary">{grade}</Badge></div>
        <h1 className="mb-3 text-3xl font-bold text-primary">{title}</h1>
        <p className="mb-5 text-secondary">{description}</p>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-2xl font-bold text-primary">{lesson_count}</p><p className="text-sm text-secondary">Lessons</p></div><div><p className="text-2xl font-bold text-primary">{videos.filter((v) => v.completed).length}</p><p className="text-sm text-secondary">Completed</p></div></div>
        {!isEnrolled || isExpired ? (
          <Card tone="subtle" className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-primary">{isExpired ? 'Access Expired' : 'Unlock Course'}</p>
              <p className="text-sm text-secondary">{isExpired ? 'Renew your access to continue learning' : 'Get full access to all lessons'}</p>
            </div>
            <div className="text-right"><p className="text-2xl font-bold text-primary-700">MWK {price_mwk.toLocaleString()}</p><Button className="mt-2" onClick={() => onUnlock(course)}>{isExpired ? 'Renew Access' : 'Enroll Now'}</Button></div>
          </Card>
        ) : (
          <Badge variant="success">Enrolled • Expires {new Date(expiresAt).toLocaleDateString()}</Badge>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-xl font-bold text-primary">Course Lessons</h2>
        <div className="space-y-3">
          {videos.map((video) => (
            <LessonRow key={video.id} video={video} isEnrolled={isEnrolled && !isExpired} isPreview={video.is_preview} completed={video.completed} onPlay={onPlayLesson} onUnlock={() => onUnlock(course)} />
          ))}
        </div>
      </Card>
    </div>
  )
}
