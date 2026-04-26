import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SubjectFilter from '../components/courses/SubjectFilter.jsx'
import CourseGrid from '../components/courses/CourseGrid.jsx'
import { api } from '../lib/api.jsx'

// Loading skeleton component
function CourseSkeleton() {
  return (
    <motion.div 
      className="relative group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-accent-500/10"></div>
        <div className="relative h-56 bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <div className="h-6 bg-gradient-to-r from-primary-200 to-primary-300 rounded-full w-16 animate-pulse"></div>
              <div className="h-6 bg-gradient-to-r from-accent-200 to-accent-300 rounded-full w-20 animate-pulse"></div>
            </div>
            <div className="h-8 bg-gradient-to-r from-amber-200 to-amber-300 rounded-xl w-24 animate-pulse"></div>
          </div>
          <div className="space-y-3">
            <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-full animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-2/3 animate-pulse"></div>
          </div>
          <div className="flex items-center justify-between mt-6">
            <div className="h-5 bg-gradient-to-r from-primary-200 to-primary-300 rounded-lg w-20 animate-pulse"></div>
            <div className="h-10 bg-gradient-to-r from-primary-400 to-primary-500 rounded-xl w-28 animate-pulse"></div>
          </div>
        </div>
      </div>
    </motion.div>
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
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-400/20 to-accent-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-accent-400/20 to-primary-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center py-20">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-8 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-pink-400 rounded-2xl animate-pulse"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-4"
            >
              Oops! Something went wrong
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-slate-600 mb-8 leading-relaxed text-lg"
            >
              {error}
            </motion.p>
            
            <motion.button 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              className="relative group px-8 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">Try Again</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-accent-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </motion.button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-primary-400/10 to-accent-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-tr from-accent-400/10 to-primary-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-300/5 to-cyan-300/5 rounded-full blur-3xl"></div>
      </div>

      {/* Modern Glassmorphism Header */}
      <motion.header 
        className="relative z-50 sticky top-0"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
      >
        <div className="bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-lg">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <motion.div 
                className="flex items-center space-x-4"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-accent-400 rounded-xl blur-sm opacity-75"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">MSCE Learn</h1>
                  <p className="text-sm text-slate-500 font-medium">Excel in your exams</p>
                </div>
              </motion.div>
              
              <nav className="flex items-center space-x-8">
                <motion.a 
                  href="#" 
                  className="text-slate-700 hover:text-primary-600 font-semibold transition-all duration-300 relative group"
                  whileHover={{ y: -2 }}
                >
                  Home
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-600 group-hover:w-full transition-all duration-300"></span>
                </motion.a>
                <motion.a 
                  href="#" 
                  className="text-slate-700 hover:text-primary-600 font-semibold transition-all duration-300 relative group"
                  whileHover={{ y: -2 }}
                >
                  Courses
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-600 group-hover:w-full transition-all duration-300"></span>
                </motion.a>
                <motion.a 
                  href="#" 
                  className="text-slate-700 hover:text-primary-600 font-semibold transition-all duration-300 relative group"
                  whileHover={{ y: -2 }}
                >
                  About
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-600 group-hover:w-full transition-all duration-300"></span>
                </motion.a>
                <div className="flex items-center space-x-4 pl-8 border-l border-slate-200">
                  <motion.button 
                    className="relative p-2 text-slate-600 hover:text-primary-600 transition-colors"
                    whileHover={{ scale: 1.1, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </motion.button>
                  <motion.button 
                    className="relative group px-6 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="relative z-10">Sign In</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-accent-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </motion.button>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        {/* Modern Hero Section */}
        <motion.section 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <div className="max-w-4xl mx-auto">
            <motion.div 
              className="mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
                <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                  Master Your
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-accent-600 bg-clip-text text-transparent">
                  MSCE & JCE
                </span>
                <br />
                <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                  Exams
                </span>
              </h1>
            </motion.div>
            
            <motion.p 
              className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed max-w-3xl mx-auto font-light"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Access expert-led video lessons, practice tests, and personalized learning paths 
              designed for Malawian students. Learn at your own pace, anywhere, anytime.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <motion.button 
                className="relative group px-10 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 overflow-hidden"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">Browse Courses</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-accent-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </motion.button>
              <motion.button 
                className="relative group px-10 py-4 bg-white/80 backdrop-blur-xl text-primary-600 font-bold text-lg rounded-2xl border-2 border-primary-200 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">Learn More</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-accent-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </motion.button>
            </motion.div>
          </div>
          
          {/* Modern Stats Cards */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            {[
              { value: "50+", label: "Video Lessons", color: "from-primary-500 to-primary-600" },
              { value: "10", label: "Subjects", color: "from-accent-500 to-accent-600" },
              { value: "1000+", label: "Students", color: "from-primary-500 to-primary-600" },
              { value: "95%", label: "Success Rate", color: "from-accent-500 to-accent-600" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="relative group"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 p-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10"></div>
                  <div className="relative">
                    <div className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
                      {stat.value}
                    </div>
                    <div className="text-sm md:text-base text-slate-600 font-medium">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Modern Features Section */}
        <motion.section 
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-4">
              Why Choose MSCE Learn?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Experience the future of education with our cutting-edge learning platform
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
                title: "Expert Teachers",
                description: "Learn from experienced Malawian educators who understand the curriculum inside out.",
                color: "from-primary-500 to-primary-600",
                bgColor: "from-primary-50 to-primary-100"
              },
              {
                icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                title: "Learn Anytime",
                description: "Access lessons 24/7 on any device. Study at your own pace, anywhere with internet.",
                color: "from-accent-500 to-accent-600",
                bgColor: "from-accent-50 to-accent-100"
              },
              {
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                title: "Track Progress",
                description: "Monitor your learning journey with detailed progress reports and performance analytics.",
                color: "from-primary-500 to-primary-600",
                bgColor: "from-primary-50 to-primary-100"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="group"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.8 + index * 0.2 }}
                whileHover={{ y: -10 }}
              >
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl border border-white/20 shadow-xl group-hover:shadow-2xl transition-all duration-500 p-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div>
                  <div className="relative">
                    <div className={`w-16 h-16 bg-gradient-to-br ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <svg className={`w-8 h-8 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Modern Course Section */}
        <motion.section 
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2 }}
        >
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.2 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-4">
              Available Courses
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choose from our comprehensive selection of MSCE and JCE courses. 
              Each course includes video lessons, practice materials, and assessments.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.4 }}
          >
            <SubjectFilter onFilterChange={handleFilterChange} />
          </motion.div>

          {/* Course Grid */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
              >
                {[...Array(6)].map((_, index) => (
                  <CourseSkeleton key={index} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
              >
                <CourseGrid 
                  courses={filteredCourses}
                  enrollments={enrollments}
                  onUnlock={handleUnlock}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          {!loading && filteredCourses && (
            <motion.div 
              className="mt-16 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 2.6 }}
            >
              <div className="inline-flex items-center px-6 py-3 bg-white/60 backdrop-blur-xl border border-white/20 rounded-full shadow-lg">
                <span className="text-sm text-slate-600 font-medium">
                  {filteredCourses.length === 0 
                    ? 'No courses match your filters'
                    : `Showing ${filteredCourses.length} of ${courses.length} course${courses.length !== 1 ? 's' : ''}`
                  }
                </span>
              </div>
            </motion.div>
          )}
        </motion.section>
      </main>
    </motion.div>
  )
}
