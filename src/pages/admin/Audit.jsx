import React, { useState, useEffect } from 'react'

export default function Audit() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [eventFilter, setEventFilter] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [exportLoading, setExportLoading] = useState(false)

  const eventTypes = [
    'user.login',
    'user.logout',
    'user.register',
    'payment.initiated',
    'payment.success',
    'payment.failed',
    'course.access_granted',
    'course.completed',
    'admin.login',
    'admin.stats_viewed',
    'admin.manual_grant',
    'admin.manual_fail',
    'login_failed',
    'webhook_signature_failed',
    'payment_mismatch',
    'feature_flag_changed',
    'course_created',
    'course_published',
    'course_unpublished'
  ]

  useEffect(() => {
    fetchAuditEvents()
  }, [currentPage, eventFilter, dateRange])

  const fetchAuditEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50'
      })

      if (eventFilter) {
        params.append('event_type', eventFilter)
      }

      if (dateRange.start) {
        params.append('start_date', dateRange.start)
      }

      if (dateRange.end) {
        params.append('end_date', dateRange.end)
      }

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch(`/api/admin/audit?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch audit events')
      }

      const data = await response.json()
      setEvents(data.events || [])
      setTotalPages(data.totalPages || 1)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      setExportLoading(true)

      const params = new URLSearchParams()
      
      if (eventFilter) {
        params.append('event_type', eventFilter)
      }

      if (dateRange.start) {
        params.append('start_date', dateRange.start)
      }

      if (dateRange.end) {
        params.append('end_date', dateRange.end)
      }

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch(`/api/admin/export-audit?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to export audit log')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setError('Audit log exported successfully')
      setTimeout(() => setError(null), 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setExportLoading(false)
    }
  }

  const getEventColor = (eventType) => {
    if (eventType.includes('admin')) return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    if (eventType.includes('payment')) return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    if (eventType.includes('course')) return 'bg-green-500/20 text-green-400 border border-green-500/30'
    if (eventType.includes('login') || eventType.includes('logout')) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    if (eventType.includes('failed') || eventType.includes('mismatch')) return 'bg-red-500/20 text-red-400 border border-red-500/30'
    return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDetails = (details) => {
    if (!details) return 'No details'
    
    try {
      if (typeof details === 'string') {
        return details.length > 100 ? details.substring(0, 100) + '...' : details
      }
      
      const summary = []
      if (details.course_title) summary.push(`Course: ${details.course_title}`)
      if (details.amount_mwk) summary.push(`Amount: MWK ${details.amount_mwk}`)
      if (details.tx_ref) summary.push(`TX: ${details.tx_ref}`)
      if (details.email) summary.push(`Email: ${details.email}`)
      if (details.ip_address) summary.push(`IP: ${details.ip_address}`)
      
      return summary.length > 0 ? summary.join(', ') : JSON.stringify(details).substring(0, 100) + '...'
    } catch {
      return JSON.stringify(details).substring(0, 100) + '...'
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const clearFilters = () => {
    setEventFilter('')
    setDateRange({ start: '', end: '' })
    setCurrentPage(1)
  }

  if (loading && currentPage === 1) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-600 rounded w-1/4 mb-8"></div>
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-gray-600 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Audit Log</h1>
        <p className="text-gray-400">View and export system audit events</p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-blue-400 font-semibold">Append-Only Log</h3>
            <p className="text-blue-300 text-sm mt-1">
              This audit log is append-only. No entry can be edited or deleted to maintain data integrity.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Event Type
            </label>
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
            >
              <option value="">All Events</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange({...dateRange, start: e.target.value})
                setCurrentPage(1)
              }}
              className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange({...dateRange, end: e.target.value})
                setCurrentPage(1)
              }}
              className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exportLoading}
            className="px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0F6E56]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Audit Events</h3>
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages} • 50 rows per page
          </div>
        </div>
        
        {events.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-[#1F2D45]">
                    <th className="pb-3 font-mono text-xs">Timestamp</th>
                    <th className="pb-3">Event Type</th>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr key={index} className="border-b border-[#1F2D45]/50">
                      <td className="py-3 text-gray-400 font-mono text-xs">
                        {formatTimestamp(event.created_at)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEventColor(event.action)}`}>
                          {event.action}
                        </span>
                      </td>
                      <td className="py-3 text-gray-300">
                        {event.user_email || 'System'}
                      </td>
                      <td className="py-3 text-gray-300 max-w-md">
                        <div className="truncate">
                          {formatDetails(event.details)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-400">
                Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, events.length + ((currentPage - 1) * 50))} events
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNum
                          ? 'bg-[#0F6E56] text-white'
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {loading ? 'Loading...' : 'No audit events found'}
          </div>
        )}
      </div>

      {/* Error Messages */}
      {error && (
        <div className="fixed bottom-4 right-4 p-4 rounded-lg border bg-red-500/20 border-red-500/30 text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
