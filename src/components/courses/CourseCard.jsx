import React from 'react'
import { Link } from 'react-router-dom'

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

export default function CourseCard({ course, enrollment, onUnlock }) {
  const {
    id,
    title,
    subject,
    grade,
    lesson_count,
    price_mwk,
    preview_available,
    is_enrolled,
    expires_at,
    days_remaining
  } = course

  const isExpired = is_enrolled && days_remaining <= 0
  const subjectColor = subjectColors[subject] || 'bg-gray-100 text-gray-800'

  const handleCardClick = () => {
    if (is_enrolled && !isExpired) {
      // Navigate to course page
      window.location.href = `/course/${id}`
    }
  }

  const handleUnlockClick = (e) => {
    e.stopPropagation()
    onUnlock(course)
  }

  const handleRenewClick = (e) => {
    e.stopPropagation()
    onUnlock(course)
  }

  return (
    <div 
      className={`card-interactive relative overflow-hidden ${
        is_enrolled && !isExpired ? 'cursor-pointer' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Lock overlay for non-enrolled courses */}
      {!is_enrolled && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 text-white mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="text-white font-semibold text-lg">MWK {price_mwk.toLocaleString()}</div>
            <button 
              onClick={handleUnlockClick}
              className="mt-3 btn-primary text-sm"
            >
              Unlock Course
            </button>
          </div>
        </div>
      )}

      {/* Expired overlay */}
      {isExpired && (
        <div className="absolute inset-0 bg-red-50/90 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 text-red-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-red-600 font-semibold text-lg mb-2">Access Expired</div>
            <button 
              onClick={handleRenewClick}
              className="btn-primary text-sm"
            >
              Renew Access
            </button>
          </div>
        </div>
      )}

      {/* Course content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`badge ${subjectColor} text-xs font-medium`}>
              {subject}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-2">{title}</h3>
          </div>
          <div className="text-right">
            <span className={`badge ${
              grade === 'MSCE' ? 'badge-primary' : 'badge-secondary'
            }`}>
              {grade}
            </span>
          </div>
        </div>

        {/* Course info */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {lesson_count} lessons
          </div>
          {!is_enrolled && (
            <div className="font-semibold text-gray-900">
              MWK {price_mwk.toLocaleString()}
            </div>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {is_enrolled && !isExpired && (
            <span className="badge badge-success flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Enrolled — {days_remaining} days left
            </span>
          )}
          
          {preview_available && !is_enrolled && (
            <span className="badge badge-info">
              Preview available
            </span>
          )}
        </div>
      </div>

      {/* Hover effect for enrolled courses */}
      {is_enrolled && !isExpired && (
        <div className="absolute inset-0 bg-primary-600/5 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="text-primary-600 font-medium">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Continue Learning
          </div>
        </div>
      )}
    </div>
  )
}
