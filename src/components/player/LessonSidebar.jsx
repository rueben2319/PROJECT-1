export default function LessonSidebar({ lessons, currentVideoId, onSelect, collapsed = false, onToggleCollapse }) {
  const formatDuration = (seconds = 0) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const completedCount = lessons.filter((lesson) => lesson.completed).length

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white" aria-label="Lesson list">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h3 className="font-semibold text-gray-900">Course lessons</h3>
          <p className="mt-1 text-sm text-gray-600">{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onToggleCollapse}
          className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden"
          aria-expanded={!collapsed}
          aria-controls="lesson-list-panel"
        >
          {collapsed ? 'Show list' : 'Hide list'}
        </button>
      </div>

      <div id="lesson-list-panel" className={`${collapsed ? 'hidden' : 'block'} flex-1 overflow-y-auto`}>
        <div className="space-y-2 p-4">
          {lessons.map((lesson) => {
            const isCurrent = lesson.id === currentVideoId
            const isCompleted = lesson.completed
            const isLocked = !lesson.is_enrolled && !lesson.is_preview

            return (
              <button
                key={lesson.id}
                type="button"
                disabled={isLocked}
                onClick={() => onSelect(lesson)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                  isCurrent
                    ? 'border-primary-300 bg-primary-50'
                    : isLocked
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                    {isCompleted ? (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-green-100">
                        <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : isLocked ? (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-200">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center rounded-full ${isCurrent ? 'bg-primary-100' : 'bg-gray-100'}`}>
                        <svg className={`h-4 w-4 ${isCurrent ? 'text-primary-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className={`truncate text-sm font-medium ${isCurrent ? 'text-primary-900' : isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
                      Lesson {lesson.lesson_number}: {lesson.title}
                    </h4>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDuration(lesson.duration_seconds)}
                    </div>
                  </div>

                  {lesson.is_preview && <span className="badge badge-info text-xs">Preview</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="text-sm text-gray-600">
          <div className="mb-2 flex justify-between">
            <span>Progress</span>
            <span>{completedCount}/{lessons.length}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>
    </section>
  )
}
