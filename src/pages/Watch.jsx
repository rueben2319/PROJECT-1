import { useState, useEffect, useMemo, useCallback } from 'react'
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [toasts, setToasts] = useState([])
  const missingCourseId = !courseId

  const pushToast = ({ message, type = 'info', id }) => {
    const toastId = id || `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id: toastId, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== toastId))
    }, 2400)
  }

  const fetchCourseLessons = useCallback(async () => {
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
  }, [courseId, videoId])

  useEffect(() => {
    if (!courseId) return
    const timer = setTimeout(() => {
      fetchCourseLessons()
    }, 0)
    return () => clearTimeout(timer)
  }, [courseId, fetchCourseLessons, videoId])

  const handleProgress = async (currentSeconds) => {
    if (!(currentLesson && currentSeconds % 30 < 1)) return

    const token = localStorage.getItem('sb-access-token')
    const response = await fetch('/api/save-progress', {
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

    if (!response.ok) {
      throw new Error('Progress save failed')
    }
  }

  const handleComplete = (video) => {
    const currentIndex = lessons.findIndex((lesson) => lesson.id === video.id)
    const nextLesson = lessons[currentIndex + 1]

    pushToast({ message: nextLesson ? 'Lesson complete. Loading next lesson…' : 'Course complete. Returning to course…', type: 'success' })

    if (nextLesson) {
      setTimeout(() => navigate(`/watch/${nextLesson.id}?courseId=${courseId}`), 1200)
    } else {
      setTimeout(() => navigate(`/course/${courseId}`), 1200)
    }
  }

  const currentIndex = useMemo(() => lessons.findIndex((lesson) => lesson.id === currentLesson?.id), [currentLesson?.id, lessons])
  const nextLesson = currentIndex >= 0 ? lessons[currentIndex + 1] : null
  const completedCount = lessons.filter((lesson) => lesson.completed).length
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0

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
      ) : missingCourseId ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Course ID is required</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <div className="space-y-4 lg:grid lg:grid-cols-4 lg:gap-6 lg:space-y-0">
          <section className="space-y-4 lg:col-span-3">
            <VideoPlayer
              videoId={currentLesson.id}
              courseId={courseId}
              initialSeconds={currentLesson.watch_time_seconds || 0}
              onProgress={handleProgress}
              onComplete={handleComplete}
              onStatus={pushToast}
            />

            <div className="sticky bottom-16 z-20 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/75 lg:bottom-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Continue learning</p>
                  <p className="text-xs text-gray-600">{completedCount}/{lessons.length} complete • {progressPercent}% done</p>
                </div>
                <button
                  onClick={() => (nextLesson ? navigate(`/watch/${nextLesson.id}?courseId=${courseId}`) : navigate(`/course/${courseId}`))}
                  className="min-h-[44px] shrink-0 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {nextLesson ? `Next: ${nextLesson.lesson_number}` : 'Back to course'}
                </button>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-primary-600 transition-all" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            {currentLesson.description && (
              <div className="card">
                <div className="p-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">About this lesson</h3>
                  <p className="leading-relaxed text-gray-600">{currentLesson.description}</p>
                </div>
              </div>
            )}
          </section>

          <aside className="lg:col-span-1 lg:sticky lg:top-28 lg:h-[calc(100vh-8rem)]">
            <LessonSidebar
              lessons={lessons}
              currentVideoId={currentLesson.id}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
              onSelect={(lesson) => {
                setSidebarCollapsed(true)
                navigate(`/watch/${lesson.id}?courseId=${courseId}`)
              }}
            />
          </aside>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-24 right-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-2 lg:bottom-6" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-3 py-2 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : toast.type === 'warning'
                ? 'bg-amber-500 text-gray-900'
                : 'bg-gray-900 text-white'
            }`}
            role="status"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </StudentShell>
  )
}
