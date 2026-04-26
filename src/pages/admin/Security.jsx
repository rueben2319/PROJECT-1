import React, { useState, useEffect } from 'react'

export default function Security() {
  const [stats, setStats] = useState({
    failedLogins24h: 0,
    webhookSigFailures: 0,
    paymentMismatches: 0,
    activeSessions: 0
  })
  const [securityEvents, setSecurityEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchSecurityData()
  }, [])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('sb-access-token')
      const [statsResponse, eventsResponse] = await Promise.all([
        fetch('/api/admin/security-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/security-events', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch security stats')
      }

      const statsData = await statsResponse.json()
      setStats(statsData)

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setSecurityEvents(eventsData.events || [])
      }

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTerminateSessions = async () => {
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/terminate-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to terminate sessions')
      }

      setError('All user sessions terminated successfully')
      setTimeout(() => setError(null), 3000)
      
      // Refresh data
      await fetchSecurityData()
      setShowConfirmDialog(null)

    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleExpireStalePayments = async () => {
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/expire-stale-payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to expire stale payments')
      }

      const data = await response.json()
      setError(`Expired ${data.expired_count} stale payments`)
      setTimeout(() => setError(null), 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadAuditLog = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/export-audit', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to download audit log')
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

      setError('Audit log downloaded successfully')
      setTimeout(() => setError(null), 3000)

    } catch (err) {
      setError(err.message)
    }
  }

  const handleEmailSecurityReport = async () => {
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/email-security-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to send security report')
      }

      setError('Security report sent to admin email')
      setTimeout(() => setError(null), 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'login_failed': return 'bg-red-500'
      case 'webhook_signature_failed': return 'bg-red-500'
      case 'payment_mismatch': return 'bg-amber-500'
      case 'admin_manual_grant': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getEventLabel = (eventType) => {
    switch (eventType) {
      case 'login_failed': return 'Failed Login'
      case 'webhook_signature_failed': return 'Webhook Sig Failure'
      case 'payment_mismatch': return 'Payment Mismatch'
      case 'admin_manual_grant': return 'Admin Grant'
      default: return 'Unknown Event'
    }
  }

  const hasActiveThreats = stats.failedLogins24h > 10 || stats.webhookSigFailures > 5 || stats.paymentMismatches > 3

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-600 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
                <div className="h-4 bg-gray-600 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-600 rounded w-3/4"></div>
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
        <h1 className="text-3xl font-bold text-white mb-2">Security Centre</h1>
        <p className="text-gray-400">Monitor security threats and manage system protection</p>
      </div>

      {/* Alert Banner */}
      {hasActiveThreats && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-red-400 font-semibold">Active Security Threats Detected</h3>
              <p className="text-red-300 text-sm mt-1">
                {stats.failedLogins24h > 10 && `${stats.failedLogins24h} failed login attempts. `}
                {stats.webhookSigFailures > 5 && `${stats.webhookSigFailures} webhook signature failures. `}
                {stats.paymentMismatches > 3 && `${stats.paymentMismatches} payment mismatches.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <div className={`text-sm ${stats.failedLogins24h > 10 ? 'text-red-500' : 'text-gray-400'}`}>
              24h
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono ${
              stats.failedLogins24h > 10 ? 'text-red-400' : 'text-white'
            }`}>
              {stats.failedLogins24h}
            </div>
            <div className="text-sm text-gray-400">
              Failed logins
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔗</span>
            </div>
            <div className={`text-sm ${stats.webhookSigFailures > 5 ? 'text-amber-500' : 'text-gray-400'}`}>
              Total
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono ${
              stats.webhookSigFailures > 5 ? 'text-amber-400' : 'text-white'
            }`}>
              {stats.webhookSigFailures}
            </div>
            <div className="text-sm text-gray-400">
              Webhook sig failures
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
            <div className={`text-sm ${stats.paymentMismatches > 3 ? 'text-orange-500' : 'text-gray-400'}`}>
              Total
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono ${
              stats.paymentMismatches > 3 ? 'text-orange-400' : 'text-white'
            }`}>
              {stats.paymentMismatches}
            </div>
            <div className="text-sm text-gray-400">
              Payment mismatches
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-green-500 text-sm">
              Active
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.activeSessions}
            </div>
            <div className="text-sm text-gray-400">
              Active sessions
            </div>
          </div>
        </div>
      </div>

      {/* Security Controls */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-6">Security Controls</h3>
        
        <div className="space-y-3">
          {[
            { label: 'Rate Limiting', status: 'Active', description: 'Prevents brute force attacks' },
            { label: 'Webhook Signature Check', status: 'Active', description: 'Verifies PayChangu webhooks' },
            { label: 'PayChangu Re-verification', status: 'Active', description: 'Double-checks payment status' },
            { label: 'Audit Logging', status: 'Active', description: 'Logs all security events' },
            { label: 'Signed URL Expiry', status: 'Active', description: 'Time-limited video access' }
          ].map((control, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[#1F2D45]/30 rounded-lg">
              <div className="flex-1">
                <div className="text-white font-medium">{control.label}</div>
                <div className="text-sm text-gray-400">{control.description}</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 text-sm">{control.status}</span>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          These security controls are always enabled for system protection
        </p>
      </div>

      {/* Recent Security Events */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-6">Recent Security Events</h3>
        
        {securityEvents.length > 0 ? (
          <div className="space-y-3">
            {securityEvents.map((event, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-[#1F2D45]/20 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${getEventColor(event.event_type)}`}></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-300">
                    <span className="font-medium">{getEventLabel(event.event_type)}</span>
                    {event.user_email && (
                      <span className="text-gray-400 ml-2">- {event.user_email}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No recent security events
          </div>
        )}
      </div>

      {/* Manual Actions */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Manual Security Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setShowConfirmDialog('terminate')}
            className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <div className="text-red-400 font-medium">Terminate All Sessions</div>
            <div className="text-red-300 text-sm mt-1">Force logout all users</div>
          </button>

          <button
            onClick={handleExpireStalePayments}
            disabled={actionLoading}
            className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            <div className="text-amber-400 font-medium">Expire Stale Payments</div>
            <div className="text-amber-300 text-sm mt-1">Cancel old pending payments</div>
          </button>

          <button
            onClick={handleDownloadAuditLog}
            className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <div className="text-blue-400 font-medium">Download Audit Log</div>
            <div className="text-blue-300 text-sm mt-1">Export security events</div>
          </button>

          <button
            onClick={handleEmailSecurityReport}
            disabled={actionLoading}
            className="p-4 bg-[#0F6E56]/20 border border-[#0F6E56]/30 rounded-lg hover:bg-[#0F6E56]/30 transition-colors disabled:opacity-50"
          >
            <div className="text-[#0F6E56] font-medium">Email Security Report</div>
            <div className="text-[#0F6E56]/70 text-sm mt-1">Send to admin email</div>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog === 'terminate' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Terminate All Sessions</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to terminate all user sessions? This will force logout all users including yourself. You'll need to log in again after this action.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleTerminateSessions}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Terminating...' : 'Terminate Sessions'}
              </button>
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg border ${
          error.includes('success') || error.includes('downloaded') || error.includes('sent')
            ? 'bg-green-500/20 border-green-500/30 text-green-400'
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          {error}
        </div>
      )}
    </div>
  )
}
