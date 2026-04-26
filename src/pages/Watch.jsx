import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import VideoPlayer from '../components/player/VideoPlayer.jsx'
import LessonSidebar from '../components/player/LessonSidebar.jsx'
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

      // Process videos with progress data
      const processedLessons = videos.map(video => ({
        ...video,
        is_enrolled: course.is_enrolled,
        days_remaining: course.days_remaining
      }))

      setLessons(processedLessons)

      // Find current lesson
      const current = processedLessons.find(lesson => lesson.id === videoId)
      if (current) {
        setCurrentLesson(current)
      } else {
        setError('Lesson not found')
      }

    } catch (err) {
      if (err.status === 403) {
        setError('You do not have access to this lesson')
      } else if (err.status === 404) {
        setError('Course or lesson not found')
      } else {
        setError(err.message || 'Failed to load lesson')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLessonClick = (lesson) => {
    navigate(`/watch/${lesson.id}?courseId=${courseId}`)
  }

  const handleProgress = async (currentSeconds, totalDuration) => {
    // Debounced progress saving
    if (currentLesson && currentSeconds % 30 < 1) { // Save every 30 seconds
      try {
        const token = localStorage.getItem('sb-access-token')
        await fetch('/api/save-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
    // Mark lesson as complete and navigate to next lesson
    const currentIndex = lessons.findIndex(lesson => lesson.id === video.id)
    const nextLesson = lessons[currentIndex + 1]

    if (nextLesson) {
      // Auto-navigate to next lesson after 2 seconds
      setTimeout(() => {
        navigate(`/watch/${nextLesson.id}?courseId=${courseId}`)
      }, 2000)
    } else {
      // Last lesson completed - navigate back to course
      setTimeout(() => {
        navigate(`/course/${courseId}`)
      }, 2000)
    }
  }

  const handleGoBack = () => {
    navigate(`/course/${courseId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-50 via-white to-accent-50/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <button 
              onClick={handleGoBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Loading Lesson...</h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="aspect-video bg-black rounded-lg animate-pulse"></div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 animate-pulse">
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-50 via-white to-accent-50/20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Lesson</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-x-4">
              <button 
                onClick={fetchCourseLessons}
                className="btn-primary"
              >
                Try Again
              </button>
              <button 
                onClick={handleGoBack}
                className="btn-outline"
              >
                Back to Course
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentLesson) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-50 via-white to-accent-50/20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleGoBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentLesson.title}</h1>
                <p className="text-sm text-gray-600">
                  Lesson {currentLesson.lesson_number} • {lessons.length} lessons total
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600">S</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video Player */}
          <div className="lg:col-span-3">
            <VideoPlayer
              videoId={currentLesson.id}
              courseId={courseId}
              initialSeconds={currentLesson.watch_time_seconds || 0}
              onProgress={handleProgress}
              onComplete={handleComplete}
            />
            
            {/* Lesson Description */}
            {currentLesson.description && (
              <div className="card mt-6">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About this lesson</h3>
                  <p className="text-gray-600 leading-relaxed">{currentLesson.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Lesson Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 h-[600px] sticky top-8">
              <LessonSidebar
                lessons={lessons}
                currentVideoId={currentLesson.id}
                onSelect={handleLessonClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
