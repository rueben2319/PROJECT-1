import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import VideoPlayer from '../components/player/VideoPlayer.jsx'
import LessonSidebar from '../components/player/LessonSidebar.jsx'
import StudentShell from '../components/student/StudentShell.jsx'
import { api } from '../lib/api.jsx'

export default function Watch() {
  const { videoId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const courseId = new URLSearchParams(location.search).get('courseId')

  const [lessons, setLessons] = useState([])
  const [currentLesson, setCurrentLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!courseId) {
      setError('Course ID is required')
      setLoading(false)
      return
    }
    fetchCourseLessons()
  }, [courseId, videoId])

  const fetchCourseLessons = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get(`/courses/${courseId}`)
      const { course, videos } = response.data
      const processedLessons = videos.map((video) => ({
        ...video,
        is_enrolled: course.is_enrolled,
        days_remaining: course.days_remaining
      }))

      setLessons(processedLessons)
      const current = processedLessons.find((lesson) => lesson.id === videoId)
      if (current) setCurrentLesson(current)
      else setError('Lesson not found')
    } catch (err) {
      if (err.status === 403) setError('You do not have access to this lesson')
      else if (err.status === 404) setError('Course or lesson not found')
      else setError(err.message || 'Failed to load lesson')
    } finally {
      setLoading(false)
    }
  }

  const handleProgress = async (currentSeconds) => {
    if (currentLesson && currentSeconds % 30 < 1) {
      try {
        const token = localStorage.getItem('sb-access-token')
        await fetch('/api/save-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            video_id: currentLesson.id,
            seconds_watched: Math.floor(currentSeconds)
          })
        })
      } catch (err) {
        console.error('Failed to save progress:', err)
      }
    }
  }

  const handleComplete = (video) => {
    const currentIndex = lessons.findIndex((lesson) => lesson.id === video.id)
    const nextLesson = lessons[currentIndex + 1]

    if (nextLesson) {
      setTimeout(() => navigate(`/watch/${nextLesson.id}?courseId=${courseId}`), 2000)
    } else {
      setTimeout(() => navigate(`/course/${courseId}`), 2000)
    }
  }

  if (!currentLesson && !loading && !error) return null

  return (
    <StudentShell
      title={currentLesson?.title || 'Lesson'}
      subtitle={currentLesson ? `Lesson ${currentLesson.lesson_number} • ${lessons.length} lessons` : 'Loading lesson'}
      topActions={<button onClick={() => navigate(`/course/${courseId}`)} className="touch-target min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm text-gray-700">Back</button>}
      bottomNav={[{ label: 'Course', to: `/course/${courseId}`, icon: '📘' }, { label: 'Watch', to: `/watch/${videoId}`, icon: '▶️' }, { label: 'Home', to: '/', icon: '🏠' }]}
    >
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <VideoPlayer
              videoId={currentLesson.id}
              courseId={courseId}
              initialSeconds={currentLesson.watch_time_seconds || 0}
              onProgress={handleProgress}
              onComplete={handleComplete}
            />
            {currentLesson.description && (
              <div className="card mt-6">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About this lesson</h3>
                  <p className="text-gray-600 leading-relaxed">{currentLesson.description}</p>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            <div className="h-[540px] overflow-hidden rounded-lg border border-gray-200 bg-white lg:sticky lg:top-28">
              <LessonSidebar
                lessons={lessons}
                currentVideoId={currentLesson.id}
                onSelect={(lesson) => navigate(`/watch/${lesson.id}?courseId=${courseId}`)}
              />
            </div>
          </div>
        </div>
      )}
    </StudentShell>
  )
}
