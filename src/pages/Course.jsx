import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CourseDetail from '../components/courses/CourseDetail.jsx'
import StudentShell from '../components/student/StudentShell.jsx'
import { api } from '../lib/api.jsx'

export default function Course() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { if (id) fetchCourse() }, [id])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get(`/courses/${id}`)
      setCourse(response.data.course)
      setVideos(response.data.videos)
    } catch (err) {
      setError(err.status === 404 ? 'Course not found' : (err.message || 'Failed to load course'))
    } finally {
      setLoading(false)
    }
  }

  if (!course && !loading && !error) return null

  return (
    <StudentShell
      title={course?.title || 'Course Details'}
      subtitle={course ? `${videos.length} lesson${videos.length === 1 ? '' : 's'}` : 'Loading course'}
      topActions={<button onClick={() => navigate('/')} className="touch-target min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm text-gray-700">Back</button>}
      bottomNav={[{ label: 'Home', to: '/', icon: '🏠' }, { label: 'Course', to: `/course/${id}`, icon: '📘' }]}
    >
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="mb-3">{error}</p>
          <button onClick={fetchCourse} className="touch-target min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-white">Try Again</button>
        </div>
      ) : (
        <CourseDetail
          course={course}
          videos={videos}
          isEnrolled={course.is_enrolled}
          expiresAt={course.expires_at}
          daysRemaining={course.days_remaining}
          onUnlock={(courseData) => navigate(`/payment?course_id=${courseData.id}`)}
          onPlayLesson={(video) => navigate(`/watch/${video.id}?courseId=${id}`)}
        />
      )}
    </StudentShell>
  )
}
