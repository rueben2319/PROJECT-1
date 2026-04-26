import React from 'react'

export default function LessonSidebar({ lessons, currentVideoId, onSelect }) {
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white border-l border-gray-200 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Course Lessons</h3>
        <p className="text-sm text-gray-600 mt-1">
          {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Lesson List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {lessons.map((lesson) => {
            const isCurrent = lesson.id === currentVideoId
            const isCompleted = lesson.completed
            const isLocked = !lesson.is_enrolled && !lesson.is_preview

            return (
              <div
                key={lesson.id}
                onClick={() => !isLocked && onSelect(lesson)}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  isCurrent
                    ? 'border-primary-300 bg-primary-50 cursor-pointer'
                    : isLocked
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
                    {isCompleted ? (
                      <div className="w-full h-full bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : isLocked ? (
                      <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    ) : isCurrent ? (
                      <div className="w-full h-full bg-primary-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Lesson Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-medium text-sm truncate ${
                        isCurrent
                          ? 'text-primary-900'
                          : isLocked
                          ? 'text-gray-500'
                          : 'text-gray-900'
                      }`}>
                        Lesson {lesson.lesson_number}: {lesson.title}
                      </h4>
                      {lesson.is_preview && (
                        <span className="badge badge-info text-xs">Preview</span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDuration(lesson.duration_seconds)}
                    </div>
                  </div>

                  {/* Current Lesson Indicator */}
                  {isCurrent && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-8 bg-primary-600 rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Progress Bar for Completed Lessons */}
                {isCompleted && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div className="bg-green-500 h-1 rounded-full" style={{width: '100%'}}></div>
                    </div>
                  </div>
                )}

                {/* Progress Bar for Current Lesson */}
                {isCurrent && lesson.watch_time_seconds && lesson.duration_seconds && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-primary-600 h-1 rounded-full transition-all duration-300" 
                        style={{
                          width: `${Math.min((lesson.watch_time_seconds / lesson.duration_seconds) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <div className="flex justify-between mb-2">
            <span>Progress</span>
            <span>{lessons.filter(l => l.completed).length}/{lessons.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
              style={{
                width: `${lessons.length > 0 ? (lessons.filter(l => l.completed).length / lessons.length) * 100 : 0}%`
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}
