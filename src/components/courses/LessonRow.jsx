import React from 'react'

export default function LessonRow({ 
  video, 
  isEnrolled, 
  isPreview, 
  completed, 
  onPlay, 
  onUnlock 
}) {
  const {
    id,
    title,
    lesson_number,
    duration_seconds,
    is_preview
  } = video

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleClick = () => {
    if (isPreview || isEnrolled) {
      onPlay(video)
    } else {
      onUnlock(video)
    }
  }

  const isLocked = !isEnrolled && !isPreview
  const canPlay = isPreview || isEnrolled

  return (
    <div 
      className={`flex items-center p-4 rounded-lg border transition-all duration-200 ${
        canPlay 
          ? 'border-gray-200 hover:border-primary-300 hover:bg-primary-50 cursor-pointer' 
          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
      }`}
      onClick={handleClick}
    >
      {/* Status/Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4">
        {completed ? (
          <div className="w-full h-full bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        ) : isLocked ? (
          <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        ) : (
          <div className="w-full h-full bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Lesson Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h3 className="font-semibold text-gray-900 truncate">
            Lesson {lesson_number}: {title}
          </h3>
          {isPreview && (
            <span className="badge badge-info text-xs">Preview</span>
          )}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDuration(duration_seconds)}
        </div>
      </div>

      {/* Action Indicator */}
      <div className="flex-shrink-0 ml-4">
        {canPlay && !completed && (
          <div className="text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {isLocked && (
          <div className="text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
