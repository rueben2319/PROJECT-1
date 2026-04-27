import React, { useState, useEffect } from 'react'
import { AdminSectionHeader, ConfirmActionModal, StatusToast, CompactChartContainer } from '../../components/admin/AdminPrimitives.jsx'

export default function Payments() {
  const [stats, setStats] = useState({
    todayRevenue: { mwk: 0, usd: 0 },
    monthRevenue: { mwk: 0, usd: 0 },
    pendingCount: 0,
    failedRate: 0
  })
  const [transactions, setTransactions] = useState([])
  const [networkRevenue, setNetworkRevenue] = useState([])
  const [topCourses, setTopCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchPaymentsData()
  }, [])

  const fetchPaymentsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch payments data')
      }

      const data = await response.json()
      
      setStats(data.stats || {})
      setTransactions(data.transactions || [])
      setNetworkRevenue(data.network_revenue || [])
      setTopCourses(data.top_courses || [])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentAction = async (txRef, action) => {
    setSelectedTransaction(txRef)
    setConfirmAction(action)
    setShowConfirmDialog(true)
  }

  const confirmPaymentAction = async () => {
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/payment-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tx_ref: selectedTransaction,
          action: confirmAction
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process payment action')
      }

      // Refresh data
      await fetchPaymentsData()
      setToast({ tone: 'success', message: `Payment ${confirmAction} successful for ${selectedTransaction}` })
      
      // Close dialog
      setShowConfirmDialog(false)
      setSelectedTransaction(null)
      setConfirmAction(null)

    } catch (err) {
      setError(err.message)
      setToast({ tone: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (amount, currency = 'MWK') => {
    if (currency === 'MWK') {
      return `MWK ${amount.toLocaleString()}`
    }
    return `$${amount.toLocaleString()}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
      case 'PENDING': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
      case 'FAILED': return 'bg-red-500/20 text-red-400 border border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    }
  }

  const getActionButtons = (transaction) => {
    if (transaction.status !== 'PENDING') return null
    
    const isOldPending = new Date(transaction.created_at) < new Date(Date.now() - 30 * 60 * 1000)
    
    return (
      <div className="flex space-x-2">
        <button
          onClick={() => handlePaymentAction(transaction.tx_ref, 'grant')}
          className="touch-target min-h-[44px] px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors text-sm"
        >
          Grant
        </button>
        <button
          onClick={() => handlePaymentAction(transaction.tx_ref, 'fail')}
          className="touch-target min-h-[44px] px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors text-sm"
        >
          Fail
        </button>
      </div>
    )
  }

  // Check for old pending payments
  const oldPendingCount = transactions.filter(tx => 
    tx.status === 'PENDING' && 
    new Date(tx.created_at) < new Date(Date.now() - 30 * 60 * 1000)
  ).length

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
      <AdminSectionHeader title="Payment Monitor" description="Manage and monitor all payment transactions" />

      {/* Alert Banner */}
      {oldPendingCount > 0 && (
        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/30 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-amber-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-amber-400 font-semibold">Pending Payment Alert</h3>
              <p className="text-amber-300 text-sm mt-1">
                {oldPendingCount} payment{oldPendingCount !== 1 ? 's' : ''} pending for more than 30 minutes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#0F6E56]/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-green-500 text-sm">
              Today
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {formatCurrency(stats.todayRevenue.mwk)}
            </div>
            <div className="text-sm text-gray-400">
              ≈ {formatCurrency(stats.todayRevenue.usd, 'USD')}
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
            <div className="text-blue-500 text-sm">
              Month
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {formatCurrency(stats.monthRevenue.mwk)}
            </div>
            <div className="text-sm text-gray-400">
              ≈ {formatCurrency(stats.monthRevenue.usd, 'USD')}
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
            {stats.pendingCount > 0 && (
              <div className="text-amber-500 text-sm animate-pulse">
                Pending
              </div>
            )}
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono ${
              stats.pendingCount > 0 ? 'text-amber-400' : 'text-white'
            }`}>
              {stats.pendingCount}
            </div>
            <div className="text-sm text-gray-400">
              Pending payments
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <div className="text-red-500 text-sm">
              Rate
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.failedRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">
              Failed rate
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Network */}
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Revenue by Network</h3>
          
          {networkRevenue.length > 0 ? (
            <CompactChartContainer>
            <div className="space-y-4 min-w-[520px]">
              {networkRevenue.map((network) => {
                const maxRevenue = Math.max(...networkRevenue.map(n => n.revenue_mwk))
                const width = maxRevenue > 0 ? (network.revenue_mwk / maxRevenue) * 100 : 0
                
                return (
                  <div key={network.network} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{network.network}</span>
                      <span className="text-white font-mono">
                        {formatCurrency(network.revenue_mwk)}
                      </span>
                    </div>
                    <div className="w-full bg-[#1F2D45] rounded-full h-2">
                      <div 
                        className="bg-[#0F6E56] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(width, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
            </CompactChartContainer>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No revenue data available
            </div>
          )}
        </div>

        {/* Top Selling Courses */}
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Top Selling Courses</h3>
          
          {topCourses.length > 0 ? (
            <CompactChartContainer>
            <div className="space-y-4 min-w-[520px]">
              {topCourses.map((course, index) => {
                const maxRevenue = Math.max(...topCourses.map(c => c.revenue_mwk))
                const width = maxRevenue > 0 ? (course.revenue_mwk / maxRevenue) * 100 : 0
                
                return (
                  <div key={course.course_id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{course.course_title}</span>
                      <span className="text-white font-mono">
                        {formatCurrency(course.revenue_mwk)}
                      </span>
                    </div>
                    <div className="w-full bg-[#1F2D45] rounded-full h-2">
                      <div 
                        className="bg-[#0F6E56] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(width, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
            </CompactChartContainer>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No course data available
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Recent Transactions</h3>
        
        {transactions.length > 0 ? (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-[#1F2D45]">
                  <th className="pb-3 font-mono text-xs">TX Ref</th>
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Course</th>
                  <th className="pb-3 font-mono">Amount</th>
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 font-mono text-xs">Time</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={index} className="border-b border-[#1F2D45]/50">
                    <td className="py-3 text-gray-300 font-mono text-xs">
                      {transaction.tx_ref}
                    </td>
                    <td className="py-3 text-gray-300">
                      {transaction.student_name}
                    </td>
                    <td className="py-3 text-gray-300">
                      {transaction.course_title}
                    </td>
                    <td className="py-3 text-white font-mono">
                      {formatCurrency(transaction.amount_mwk)}
                    </td>
                    <td className="py-3 text-gray-400">
                      {transaction.network}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 font-mono text-xs">
                      {new Date(transaction.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td className="py-3">
                      {getActionButtons(transaction)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {transactions.map((transaction, index) => (
              <div key={index} className="rounded-lg border border-[#1F2D45] bg-[#0A0E1A] p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-semibold">{transaction.student_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{transaction.tx_ref}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{transaction.course_title}</p>
                <p className="text-sm text-gray-300">Network: {transaction.network}</p>
                <p className="text-sm font-mono text-white">{formatCurrency(transaction.amount_mwk)}</p>
                {getActionButtons(transaction)}
              </div>
            ))}
          </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No transactions found
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmActionModal
        isOpen={showConfirmDialog}
        title={`Confirm ${confirmAction === 'grant' ? 'Grant' : 'Fail'} Payment`}
        message={`Are you sure you want to ${confirmAction} payment ${selectedTransaction || ''}?`}
        confirmLabel={`Confirm ${confirmAction === 'grant' ? 'Grant' : 'Fail'}`}
        tone={confirmAction === 'grant' ? 'success' : 'danger'}
        loading={actionLoading}
        onConfirm={confirmPaymentAction}
        onCancel={() => {
          setShowConfirmDialog(false)
          setSelectedTransaction(null)
          setConfirmAction(null)
        }}
      />
      <StatusToast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
