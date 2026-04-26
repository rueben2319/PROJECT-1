import React, { useState, useEffect } from 'react'

export default function Content() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showVideoForm, setShowVideoForm] = useState(false)
  const [courseForm, setCourseForm] = useState({
    title: '',
    subject: '',
    grade: 'MSCE',
    price_mwk: '',
    description: ''
  })
  const [videoForm, setVideoForm] = useState({
    course_id: '',
    title: '',
    lesson_order: 1,
    is_preview: false,
    r2_playlist_path: ''
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }

      const data = await response.json()
      setCourses(data.courses || [])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/create-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseForm)
      })

      if (!response.ok) {
        throw new Error('Failed to create course')
      }

      // Reset form and refresh courses
      setCourseForm({
        title: '',
        subject: '',
        grade: 'MSCE',
        price_mwk: '',
        description: ''
      })
      setShowCourseForm(false)
      await fetchCourses()

    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handlePublishCourse = async (courseId, publish) => {
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/publish-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          course_id: courseId,
          publish
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update course status')
      }

      await fetchCourses()

    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleVideoUpload = async (e) => {
    e.preventDefault()
    
    try {
      setActionLoading(true)
      setUploadProgress(0)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/upload-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(videoForm)
      })

      if (!response.ok) {
        throw new Error('Failed to upload video')
      }

      // Reset form
      setVideoForm({
        course_id: '',
        title: '',
        lesson_order: 1,
        is_preview: false,
        r2_playlist_path: ''
      })
      setShowVideoForm(false)
      setUploadProgress(0)
      await fetchCourses()

    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (published) => {
    return published 
      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  }

  const formatCurrency = (amount) => {
    return `MWK ${amount.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-600 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
                <div className="h-6 bg-gray-600 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-600 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Content Management</h1>
        <p className="text-gray-400">Create and manage courses and video content</p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setShowCourseForm(true)}
          className="px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0F6E56]/80 transition-colors"
        >
          Add New Course
        </button>
        <button
          onClick={() => setShowVideoForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Upload Video Lesson
        </button>
      </div>

      {/* Published Courses Table */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Published Courses</h3>
        
        {courses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-[#1F2D45]">
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Grade</th>
                  <th className="pb-3">Lessons</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Enrollments</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, index) => (
                  <tr key={index} className="border-b border-[#1F2D45]/50">
                    <td className="py-3 text-gray-300">
                      {course.title}
                    </td>
                    <td className="py-3 text-gray-300">
                      {course.grade}
                    </td>
                    <td className="py-3 text-white font-mono">
                      {course.lesson_count || 0}
                    </td>
                    <td className="py-3 text-white font-mono">
                      {formatCurrency(course.price_mwk)}
                    </td>
                    <td className="py-3 text-white font-mono">
                      {course.enrollment_count || 0}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(course.published)}`}>
                        {course.published ? 'LIVE' : 'DRAFT'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex space-x-2">
                        <button
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handlePublishCourse(course.id, !course.published)}
                          disabled={actionLoading}
                          className={`px-3 py-1 rounded transition-colors text-sm ${
                            course.published
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                              : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                          }`}
                        >
                          {course.published ? 'Unpublish' : 'Publish'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No courses found. Create your first course to get started.
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showCourseForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Add New Course</h3>
            
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course Title
                </label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                  required
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                  placeholder="e.g., Mathematics - Algebra Basics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <select
                  value={courseForm.subject}
                  onChange={(e) => setCourseForm({...courseForm, subject: e.target.value})}
                  required
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                >
                  <option value="">Select subject...</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="English">English</option>
                  <option value="Geography">Geography</option>
                  <option value="History">History</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Computer Studies">Computer Studies</option>
                  <option value="Life Skills">Life Skills</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Grade Level
                </label>
                <select
                  value={courseForm.grade}
                  onChange={(e) => setCourseForm({...courseForm, grade: e.target.value})}
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                >
                  <option value="MSCE">MSCE</option>
                  <option value="JCE">JCE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price (MWK)
                </label>
                <input
                  type="number"
                  value={courseForm.price_mwk}
                  onChange={(e) => setCourseForm({...courseForm, price_mwk: e.target.value})}
                  required
                  min="0"
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                  required
                  rows={4}
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                  placeholder="Course description and learning objectives..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0F6E56]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Creating...' : 'Create Course'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCourseForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Video Modal */}
      {showVideoForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Upload Video Lesson</h3>
            
            <form onSubmit={handleVideoUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Course
                </label>
                <select
                  value={videoForm.course_id}
                  onChange={(e) => setVideoForm({...videoForm, course_id: e.target.value})}
                  required
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                >
                  <option value="">Select course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lesson Title
                </label>
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({...videoForm, title: e.target.value})}
                  required
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                  placeholder="e.g., Lesson 1: Introduction to Algebra"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lesson Order
                </label>
                <input
                  type="number"
                  value={videoForm.lesson_order}
                  onChange={(e) => setVideoForm({...videoForm, lesson_order: Number(e.target.value)})}
                  required
                  min="1"
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                  <input
                    type="checkbox"
                    checked={videoForm.is_preview}
                    onChange={(e) => setVideoForm({...videoForm, is_preview: e.target.checked})}
                    className="rounded border-gray-600 bg-[#1F2D45] text-[#0F6E56] focus:ring-[#0F6E56]"
                  />
                  <span>Free Preview Lesson</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Preview lessons can be watched without enrollment
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  R2 Playlist Path
                </label>
                <textarea
                  value={videoForm.r2_playlist_path}
                  onChange={(e) => setVideoForm({...videoForm, r2_playlist_path: e.target.value})}
                  required
                  rows={3}
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56] font-mono text-xs"
                  placeholder="courses/mathematics/algebra-basics/playlist.m3u8"
                />
                <div className="mt-2 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-400 text-xs">
                    <strong>Note:</strong> Video is processed with FFmpeg + HLS before upload.
                    Run scripts/process-video.sh first, then paste the path here.
                  </p>
                </div>
              </div>

              {uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Upload Progress</span>
                    <span className="text-white">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#1F2D45] rounded-full h-2">
                    <div 
                      className="bg-[#0F6E56] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Uploading...' : 'Upload Video'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowVideoForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
