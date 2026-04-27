import React, { useState, useEffect } from 'react'
import SubjectFilter from '../components/courses/SubjectFilter.jsx'
import CourseGrid from '../components/courses/CourseGrid.jsx'
import StudentShell from '../components/student/StudentShell.jsx'
import { api } from '../lib/api.jsx'

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
    <StudentShell title="MSCE Learn" subtitle="Choose a course and keep your streak alive" bottomNav={[{ label: 'Home', to: '/', icon: '🏠' }]}>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          <p className="mb-3 font-medium">{error}</p>
          <button onClick={fetchCourses} className="touch-target min-h-[44px] rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Try Again</button>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-border-subtle bg-surface p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Course library</p>
            <h2 className="mt-1 text-xl font-bold text-primary">Browse by subject and grade</h2>
            <p className="mt-1 text-sm text-secondary">Find your next lesson fast with smarter filters and clear enrollment badges.</p>
            <div className="mt-4">
              <SubjectFilter filters={filters} onFilterChange={setFilters} />
            </div>
          </section>

          <CourseGrid
            courses={filteredCourses}
            enrollments={enrollments}
            loading={loading}
            onUnlock={(course) => (window.location.href = `/payment?course_id=${course.id}`)}
          />
        </>
      )}
    </StudentShell>
  )
}
