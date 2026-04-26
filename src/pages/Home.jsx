import React, { useState, useEffect } from 'react'
import SubjectFilter from '../components/courses/SubjectFilter.jsx'
import CourseGrid from '../components/courses/CourseGrid.jsx'
import { api } from '../lib/api.jsx'

// Loading skeleton component
function CourseSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="h-6 bg-gray-200 rounded-full w-20 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  )
}

export default function Home() {
  const [courses, setCourses] = useState(null)
  const [filteredCourses, setFilteredCourses] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ subject: 'All', grade: 'Both' })

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [courses, filters])

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

    // Apply subject filter
    if (filters.subject && filters.subject !== 'All') {
      filtered = filtered.filter(course => course.subject === filters.subject)
    }

    // Apply grade filter
    if (filters.grade && filters.grade !== 'Both') {
      filtered = filtered.filter(course => course.grade === filters.grade)
    }

    setFilteredCourses(filtered)
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleUnlock = async (course) => {
    try {
      // Navigate to payment page
      window.location.href = `/payment?course_id=${course.id}`
    } catch (err) {
      setError('Failed to initiate payment')
    }
  }

  const handleRetry = () => {
    fetchCourses()
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-50 via-white to-accent-50/20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to load courses</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={handleRetry}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-50 via-white to-accent-50/20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">MSCE Learn</h1>
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="page-header">
          <h1 className="page-title">Explore Courses</h1>
          <p className="page-subtitle">Master your subjects with expert-led video lessons</p>
        </div>

        {/* Filters */}
        <SubjectFilter onFilterChange={handleFilterChange} />

        {/* Course Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CourseSkeleton />
            <CourseSkeleton />
            <CourseSkeleton />
          </div>
        ) : (
          <CourseGrid 
            courses={filteredCourses}
            enrollments={enrollments}
            onUnlock={handleUnlock}
          />
        )}

        {/* Results count */}
        {!loading && filteredCourses && (
          <div className="mt-8 text-center text-sm text-gray-600">
            {filteredCourses.length === 0 
              ? 'No courses match your filters'
              : `Showing ${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''}`
            }
          </div>
        )}
      </div>
    </div>
  )
}
