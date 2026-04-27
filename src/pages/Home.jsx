import React, { useState, useEffect } from 'react'
import SubjectFilter from '../components/courses/SubjectFilter.jsx'
import CourseGrid from '../components/courses/CourseGrid.jsx'
import StudentShell from '../components/student/StudentShell.jsx'
import { api } from '../lib/api.jsx'

function CourseSkeleton() {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200" />)}</div>
}

export default function Home() {
  const [courses, setCourses] = useState(null)
  const [filteredCourses, setFilteredCourses] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ subject: 'All', grade: 'Both' })

  useEffect(() => { fetchCourses() }, [])
  useEffect(() => { applyFilters() }, [courses, filters])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/courses')
      setCourses(response.data.courses)
      setEnrollments(response.data.enrollments || [])
    } catch (err) {
      setError(err.message || 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    if (!courses) return
    let filtered = [...courses]
    if (filters.subject && filters.subject !== 'All') filtered = filtered.filter((course) => course.subject === filters.subject)
    if (filters.grade && filters.grade !== 'Both') filtered = filtered.filter((course) => course.grade === filters.grade)
    setFilteredCourses(filtered)
  }

  return (
    <StudentShell title="MSCE Learn" subtitle="Browse and continue your courses" bottomNav={[{ label: 'Home', to: '/', icon: '🏠' }]}>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="mb-3">{error}</p>
          <button onClick={fetchCourses} className="touch-target rounded-lg bg-red-600 px-4 py-2 text-white min-h-[44px]">Try Again</button>
        </div>
      ) : (
        <>
          <div className="mb-6"><SubjectFilter filters={filters} onFilterChange={setFilters} /></div>
          {loading ? <CourseSkeleton /> : <CourseGrid courses={filteredCourses} enrollments={enrollments} onUnlock={(course) => (window.location.href = `/payment?course_id=${course.id}`)} />}
        </>
      )}
    </StudentShell>
  )
}
