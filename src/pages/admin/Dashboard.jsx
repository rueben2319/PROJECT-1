import React, { useState, useEffect } from 'react'
import { AdminSectionHeader, DesktopTable, MobileCardList, CompactChartContainer } from '../../components/admin/AdminPrimitives.jsx'

export default function Dashboard() {
  const [stats, setStats] = useState({
    revenue: { mwk: 0, usd: 0 },
    activeEnrollments: 0,
    pendingPayments: 0,
    expiringSoon: 0
  })
  const [revenueChart, setRevenueChart] = useState([])
  const [enrollmentsBySubject, setEnrollmentsBySubject] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [activityFeed, setActivityFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      
      setStats({
        revenue: data.revenue || { mwk: 0, usd: 0 },
        activeEnrollments: data.active_enrollments || 0,
        pendingPayments: data.pending_payments || 0,
        expiringSoon: data.expiring_soon || 0
      })
      
      setRevenueChart(data.revenue_chart || [])
      setEnrollmentsBySubject(data.enrollments_by_subject || [])
      setRecentTransactions(data.recent_transactions || [])
      setActivityFeed(data.activity_feed || [])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  const getActivityColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-500'
      case 'warning': return 'bg-amber-500'
      case 'error': return 'bg-red-500'
      case 'info': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 text-center">
          <p className="text-red-400">Failed to load dashboard data</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <AdminSectionHeader title="Command Centre" description="System overview and real-time metrics" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue */}
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#0F6E56]/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-green-500 text-sm">
              +12.5%
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {formatCurrency(stats.revenue.mwk)}
            </div>
            <div className="text-sm text-gray-400">
              ≈ {formatCurrency(stats.revenue.usd, 'USD')}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Last 30 days
          </div>
        </div>

        {/* Active Enrollments */}
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <div className="text-green-500 text-sm">
              +8.2%
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.activeEnrollments.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">
              Active students
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Currently enrolled
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
            {stats.pendingPayments > 0 && (
              <div className="text-amber-500 text-sm animate-pulse">
                Attention
              </div>
            )}
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono ${
              stats.pendingPayments > 0 ? 'text-amber-400' : 'text-white'
            }`}>
              {stats.pendingPayments}
            </div>
            <div className="text-sm text-gray-400">
              Pending payments
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {stats.pendingPayments > 0 ? 'Requires attention' : 'All caught up'}
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔄</span>
            </div>
            <div className="text-purple-500 text-sm">
              Opportunity
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.expiringSoon}
            </div>
            <div className="text-sm text-gray-400">
              Expiring in 3 days
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Renewal target
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Revenue (Last 7 Days)</h3>
          
          {revenueChart.length > 0 ? (
            <CompactChartContainer>
            <div className="space-y-4">
              {/* Chart Bars */}
              <div className="flex items-end justify-between h-40 min-w-[540px] px-2">
                {revenueChart.map((day, index) => {
                  const maxRevenue = Math.max(...revenueChart.map(d => d.revenue_mwk))
                  const height = maxRevenue > 0 ? (day.revenue_mwk / maxRevenue) * 100 : 0
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full max-w-12 relative group">
                        <div 
                          className="bg-[#0F6E56] rounded-t hover:bg-[#0F6E56]/80 transition-colors cursor-pointer"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity pointer-events-none whitespace-nowrap group-hover:opacity-100 md:group-hover:opacity-100 group-active:opacity-100">
                            {formatCurrency(day.revenue_mwk)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 text-center">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Chart Summary */}
              <div className="flex justify-between text-sm pt-4 border-t border-[#1F2D45]">
                <div className="text-gray-400">Total</div>
                <div className="text-white font-mono">
                  {formatCurrency(revenueChart.reduce((sum, day) => sum + day.revenue_mwk, 0))}
                </div>
              </div>
            </div>
            </CompactChartContainer>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No revenue data available
            </div>
          )}
        </div>

        {/* Enrollments by Subject */}
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Enrollments by Subject</h3>
          
          {enrollmentsBySubject.length > 0 ? (
            <div className="space-y-4">
              {enrollmentsBySubject.map((subject) => {
                const maxCount = Math.max(...enrollmentsBySubject.map(s => s.count))
                const width = maxCount > 0 ? (subject.count / maxCount) * 100 : 0
                
                return (
                  <div key={subject.subject} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{subject.subject}</span>
                      <span className="text-white font-mono">{subject.count}</span>
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
          ) : (
            <div className="text-center py-8 text-gray-400">
              No enrollment data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Transactions */}
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Recent Transactions</h3>
          
          {recentTransactions.length > 0 ? (
            <>
            <DesktopTable headers={['Time', 'Student', 'Course', 'Amount', 'Status', 'Network']}>
                <tbody>
                  {recentTransactions.map((transaction, index) => (
                    <tr key={index} className="border-b border-[#1F2D45]/50">
                      <td className="py-3 text-gray-400 font-mono text-xs">
                        {new Date(transaction.created_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
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
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400">
                        {transaction.network}
                      </td>
                    </tr>
                  ))}
                </tbody>
            </DesktopTable>
            <MobileCardList>
              {recentTransactions.map((transaction, index) => (
                <div key={`mobile-${index}`} className="rounded-lg border border-[#1F2D45] bg-[#0A0E1A] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold">{transaction.student_name}</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>{transaction.status}</span>
                  </div>
                  <p className="text-sm text-gray-300">{transaction.course_title}</p>
                  <p className="text-sm font-mono text-white">{formatCurrency(transaction.amount_mwk)}</p>
                  <p className="text-xs text-gray-400">{new Date(transaction.created_at).toLocaleString()}</p>
                </div>
              ))}
            </MobileCardList>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No recent transactions
            </div>
          )}
        </div>

        {/* Live Activity Feed */}
        <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Live Activity Feed</h3>
          
          {activityFeed.length > 0 ? (
            <div className="space-y-3">
              {activityFeed.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-[#1F2D45]/20">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.type)}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300">
                      {activity.message}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {new Date(activity.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
