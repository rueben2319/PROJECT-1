import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CourseDetail from '../components/courses/CourseDetail.jsx'
import { api } from '../lib/api.jsx'

export default function Course() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [course, setCourse] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id) {
      fetchCourse()
    }
  }, [id])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get(`/courses/${id}`)
      setCourse(response.data.course)
      setVideos(response.data.videos)
    } catch (err) {
      if (err.status === 404) {
        setError('Course not found')
      } else {
        setError(err.message || 'Failed to load course')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = (courseData) => {
    // Navigate to payment page with course data
    navigate(`/payment?course_id=${courseData.id}`)
  }

  const handlePlayLesson = (video) => {
    // Navigate to video player
    navigate(`/watch/${video.id}`)
  }

  const handleRetry = () => {
    fetchCourse()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-50 via-white to-accent-50/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="card mb-8 animate-pulse">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>

          {/* Lessons Skeleton */}
          <div className="card animate-pulse">
            <div className="p-6">
              <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center p-4 border border-gray-200 rounded-lg">
                    <div className="w-10 h-10 bg-gray-200 rounded-full mr-4"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {error === 'Course not found' ? 'Course Not Found' : 'Unable to load course'}
            </h2>
            <p className="text-gray-600 mb-6">
              {error === 'Course not found' 
                ? 'The course you\'re looking for doesn\'t exist or isn\'t available.'
                : error
              }
            </p>
            <div className="space-x-4">
              <button 
                onClick={handleRetry}
                className="btn-primary"
              >
                Try Again
              </button>
              <button 
                onClick={() => navigate('/')}
                className="btn-outline"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
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
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">Course Details</h1>
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

      {/* Course Content */}
      <div className="container mx-auto px-4 py-8">
        <CourseDetail
          course={course}
          videos={videos}
          isEnrolled={course.is_enrolled}
          expiresAt={course.expires_at}
          daysRemaining={course.days_remaining}
          onUnlock={handleUnlock}
          onPlayLesson={handlePlayLesson}
        />
      </div>
    </div>
  )
}
