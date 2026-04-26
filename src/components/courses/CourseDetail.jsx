import React from 'react'
import LessonRow from './LessonRow.jsx'

const subjectColors = {
  'Mathematics': 'bg-blue-100 text-blue-800',
  'English': 'bg-purple-100 text-purple-800',
  'Biology': 'bg-green-100 text-green-800',
  'Physics': 'bg-indigo-100 text-indigo-800',
  'Chemistry': 'bg-orange-100 text-orange-800',
  'History': 'bg-yellow-100 text-yellow-800',
  'Geography': 'bg-teal-100 text-teal-800',
  'Agriculture': 'bg-lime-100 text-lime-800',
  'Social Studies': 'bg-pink-100 text-pink-800',
  'Bible Knowledge': 'bg-red-100 text-red-800'
}

export default function CourseDetail({ 
  course, 
  videos = [], 
  isEnrolled, 
  expiresAt, 
  daysRemaining, 
  onUnlock, 
  onPlayLesson 
}) {
  const {
    title,
    subject,
    grade,
    description,
    price_mwk,
    lesson_count,
    total_duration_seconds
  } = course

  const subjectColor = subjectColors[subject] || 'bg-gray-100 text-gray-800'
  const isExpired = isEnrolled && daysRemaining <= 0

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const handleLessonClick = (video) => {
    if (video.is_preview || isEnrolled) {
      onPlayLesson(video)
    } else {
      onUnlock(course)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Course Header */}
      <div className="card mb-8">
        <div className="p-6">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <span className={`badge ${subjectColor}`}>
                  {subject}
                </span>
                <span className={`badge ${
                  grade === 'MSCE' ? 'badge-primary' : 'badge-secondary'
                }`}>
                  {grade}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
              <p className="text-gray-600 text-lg leading-relaxed">{description}</p>
            </div>
          </div>

          {/* Course Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{lesson_count}</div>
              <div className="text-sm text-gray-600">Lessons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatDuration(total_duration_seconds)}
              </div>
              <div className="text-sm text-gray-600">Total Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {videos.filter(v => v.completed).length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {lesson_count > 0 ? Math.round((videos.filter(v => v.completed).length / lesson_count) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>

          {/* Enrollment Status */}
          <div className={`p-4 rounded-lg border ${
            isEnrolled && !isExpired 
              ? 'bg-green-50 border-green-200' 
              : isExpired 
              ? 'bg-red-50 border-red-200'
              : 'bg-primary-50 border-primary-200'
          }`}>
            {isEnrolled && !isExpired ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-green-800">Enrolled</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Access expires soon'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-700">Expires</div>
                  <div className="font-semibold text-green-800">
                    {new Date(expiresAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ) : isExpired ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-red-800">Access Expired</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">Renew your access to continue learning</p>
                </div>
                <button 
                  onClick={() => onUnlock(course)}
                  className="btn-primary"
                >
                  Renew Access
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-semibold text-primary-800">Unlock Course</span>
                  </div>
                  <p className="text-primary-700 text-sm mt-1">Get full access to all lessons</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-800">
                    MWK {price_mwk.toLocaleString()}
                  </div>
                  <button 
                    onClick={() => onUnlock(course)}
                    className="btn-primary mt-2"
                  >
                    Enroll Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lessons Section */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Course Lessons</h2>
          
          {videos.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-600">No lessons available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => (
                <LessonRow
                  key={video.id}
                  video={video}
                  isEnrolled={isEnrolled && !isExpired}
                  isPreview={video.is_preview}
                  completed={video.completed}
                  onPlay={onPlayLesson}
                  onUnlock={handleLessonClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
