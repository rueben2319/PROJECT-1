import React, { useState, useEffect } from 'react'
import { AdminSectionHeader, FilterBar, ActionBar, ConfirmActionModal, StatusToast } from '../../components/admin/AdminPrimitives.jsx'

export default function Students() {
  const [stats, setStats] = useState({
    total: 0,
    activeToday: 0,
    expiring3d: 0,
    neverPaid: 0
  })
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [grantForm, setGrantForm] = useState({
    student_id: '',
    course_id: '',
    days: 30
  })
  const [courses, setCourses] = useState([])
  const [renewalDays, setRenewalDays] = useState(7)
  const [actionLoading, setActionLoading] = useState(false)
  const [showGrantConfirm, setShowGrantConfirm] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchStudentsData()
    fetchCourses()
  }, [])

  useEffect(() => {
    // Filter students based on search term
    if (searchTerm) {
      const filtered = students.filter(student =>
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone?.includes(searchTerm) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredStudents(filtered)
    } else {
      setFilteredStudents(students)
    }
  }, [searchTerm, students])

  const fetchStudentsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/students', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch students data')
      }

      const data = await response.json()
      
      setStats(data.stats || {})
      setStudents(data.students || [])
      setFilteredStudents(data.students || [])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || [])
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    }
  }

  const handleViewProfile = (student) => {
    setSelectedStudent(student)
    setShowProfileModal(true)
  }

  const handleGrantAccess = () => {
    setGrantForm({
      student_id: '',
      course_id: '',
      days: 30
    })
    setShowGrantModal(true)
  }

  const handleGrantSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/grant-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(grantForm)
      })

      if (!response.ok) {
        throw new Error('Failed to grant access')
      }

      // Refresh data
      await fetchStudentsData()
      setToast({ tone: 'success', message: 'Access granted successfully' })
      
      // Close modal
      setShowGrantModal(false)
      setShowGrantConfirm(false)
      setGrantForm({ student_id: '', course_id: '', days: 30 })

    } catch (err) {
      setError(err.message)
      setToast({ tone: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendRenewalSMS = async () => {
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/send-renewal-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ days: renewalDays })
      })

      if (!response.ok) {
        throw new Error('Failed to send renewal SMS')
      }

      // Show success message
      setError('Renewal SMS sent successfully')
      setToast({ tone: 'success', message: 'Renewal SMS sent successfully' })
      setTimeout(() => setError(null), 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border border-green-500/30'
      case 'expired': return 'bg-red-500/20 text-red-400 border border-red-500/30'
      case 'trial': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-600 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-600 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <AdminSectionHeader title="Student Management" description="Manage students, grant access, and monitor activity" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-blue-500 text-sm">
              Total
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">
              Registered students
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <div className="text-green-500 text-sm">
              Active
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.activeToday}
            </div>
            <div className="text-sm text-gray-400">
              Active today
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="text-amber-500 text-sm">
              Expiring
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.expiring3d}
            </div>
            <div className="text-sm text-gray-400">
              In 3 days
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
            <div className="text-purple-500 text-sm">
              Free
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.neverPaid}
            </div>
            <div className="text-sm text-gray-400">
              Never paid
            </div>
          </div>
        </div>
      </div>

      {/* Renewal Campaign */}
      <ActionBar>
        <h3 className="text-lg font-semibold text-white mb-4">Renewal Campaign</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400">
              {stats.expiring3d} students expiring in {renewalDays} days
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Send SMS reminders to encourage renewals
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={renewalDays}
              onChange={(e) => setRenewalDays(Number(e.target.value))}
              className="bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
            <button
              onClick={handleSendRenewalSMS}
              disabled={actionLoading || stats.expiring3d === 0}
              className="px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0F6E56]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Sending...' : 'Send SMS Reminder'}
            </button>
          </div>
        </div>
      </ActionBar>

      {/* Manual Grant Access */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Manual Grant Access</h3>
          <button
            onClick={handleGrantAccess}
            className="px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0F6E56]/80 transition-colors"
          >
            Grant Access
          </button>
        </div>
        <p className="text-gray-400">
          Manually grant course access to students for support or promotional purposes
        </p>
      </div>

      {/* Search */}
      <FilterBar>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111827] border border-[#1F2D45] text-white px-4 py-3 pl-10 rounded-lg focus:outline-none focus:border-[#0F6E56]"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </FilterBar>

      {/* Students Table */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Students</h3>
        
        {filteredStudents.length > 0 ? (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-[#1F2D45]">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Joined</th>
                  <th className="pb-3">Active Enrollments</th>
                  <th className="pb-3">Last Active</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={index} className="border-b border-[#1F2D45]/50">
                    <td className="py-3 text-gray-300">
                      {student.full_name || 'Unknown'}
                    </td>
                    <td className="py-3 text-gray-300">
                      {student.phone || 'N/A'}
                    </td>
                    <td className="py-3 text-gray-400">
                      {student.created_at ? formatDate(student.created_at) : 'N/A'}
                    </td>
                    <td className="py-3 text-white font-mono">
                      {student.active_enrollments || 0}
                    </td>
                    <td className="py-3 text-gray-400">
                      {student.last_active ? formatDate(student.last_active) : 'Never'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.status)}`}>
                        {student.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleViewProfile(student)}
                        className="touch-target min-h-[44px] px-3 py-1 bg-[#0F6E56]/20 text-[#0F6E56] border border-[#0F6E56]/30 rounded hover:bg-[#0F6E56]/30 transition-colors text-sm"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {filteredStudents.map((student, index) => (
              <div key={index} className="rounded-lg border border-[#1F2D45] bg-[#0A0E1A] p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-semibold">{student.full_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-400">{student.phone || 'N/A'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.status)}`}>
                    {student.status || 'Unknown'}
                  </span>
                </div>
                <div className="text-sm text-gray-300">Joined: {student.created_at ? formatDate(student.created_at) : 'N/A'}</div>
                <div className="text-sm text-gray-300">Last Active: {student.last_active ? formatDate(student.last_active) : 'Never'}</div>
                <div className="text-sm text-gray-300">Active Enrollments: <span className="font-mono text-white">{student.active_enrollments || 0}</span></div>
                <button
                  onClick={() => handleViewProfile(student)}
                  className="touch-target mt-1 min-h-[44px] w-full rounded-lg bg-[#0F6E56]/20 px-3 py-2 text-[#0F6E56] border border-[#0F6E56]/30"
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {searchTerm ? 'No students found matching your search' : 'No students found'}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Student Profile</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Student Info */}
              <div>
                <h4 className="text-white font-semibold mb-3">Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white ml-2">{selectedStudent.full_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white ml-2">{selectedStudent.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <span className="text-white ml-2">{selectedStudent.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Joined:</span>
                    <span className="text-white ml-2">
                      {selectedStudent.created_at ? formatDate(selectedStudent.created_at) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enrollments */}
              <div>
                <h4 className="text-white font-semibold mb-3">Enrollments</h4>
                {selectedStudent.enrollments && selectedStudent.enrollments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.enrollments.map((enrollment, index) => (
                      <div key={index} className="bg-[#1F2D45] rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-white font-medium">{enrollment.course_title}</div>
                            <div className="text-gray-400 text-sm">
                              Enrolled: {formatDate(enrollment.created_at)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(enrollment.status)}`}>
                              {enrollment.status}
                            </div>
                            <div className="text-gray-400 text-xs mt-1">
                              Expires: {formatDate(enrollment.expires_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No enrollments found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant Access Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Grant Course Access</h3>
            
            <form onSubmit={handleGrantSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Student
                </label>
                <select
                  value={grantForm.student_id}
                  onChange={(e) => setGrantForm({...grantForm, student_id: e.target.value})}
                  required
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                >
                  <option value="">Select student...</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course
                </label>
                <select
                  value={grantForm.course_id}
                  onChange={(e) => setGrantForm({...grantForm, course_id: e.target.value})}
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
                  Access Duration
                </label>
                <select
                  value={grantForm.days}
                  onChange={(e) => setGrantForm({...grantForm, days: Number(e.target.value)})}
                  className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>

              <div className="flex space-x-3">
              <button
                type="submit"
                disabled={actionLoading}
                onClick={(e) => {
                  e.preventDefault()
                  setShowGrantConfirm(true)
                }}
                className="flex-1 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0F6E56]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Grant Access'}
              </button>
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmActionModal
        isOpen={showGrantConfirm}
        title="Confirm manual grant"
        message="Granting access will immediately enroll the selected student into this course."
        confirmLabel="Confirm Grant"
        tone="success"
        loading={actionLoading}
        onConfirm={handleGrantSubmit}
        onCancel={() => setShowGrantConfirm(false)}
      />
      <StatusToast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
