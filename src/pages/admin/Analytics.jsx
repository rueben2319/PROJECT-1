import React, { useState, useEffect } from 'react'

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState('week')
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const data = await response.json()
      setAnalyticsData(data)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return `MWK ${amount.toLocaleString()}`
  }

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`
  }

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-400'
    if (change < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  const getChangeIcon = (change) => {
    if (change > 0) return '↑'
    if (change < 0) return '↓'
    return '→'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-600 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-600 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
                <div className="h-6 bg-gray-600 rounded w-1/3 mb-4"></div>
                <div className="h-32 bg-gray-600 rounded"></div>
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
        <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
        <p className="text-gray-400">Weekly business report and performance metrics</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          Error loading analytics: {error}
        </div>
      )}

      {analyticsData && (
        <>
          {/* Revenue Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#0F6E56]/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div className={`text-sm font-medium ${getChangeColor(analyticsData.revenue.change_percentage)}`}>
                  {getChangeIcon(analyticsData.revenue.change_percentage)} {formatPercentage(analyticsData.revenue.change_percentage)}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">
                  {formatCurrency(analyticsData.revenue.total_this_week)}
                </div>
                <div className="text-sm text-gray-400">
                  Revenue this week
                </div>
              </div>
            </div>

            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="text-sm font-medium text-gray-400">
                  This week
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">
                  {analyticsData.students.new_registrations_this_week}
                </div>
                <div className="text-sm text-gray-400">
                  New registrations
                </div>
              </div>
            </div>

            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <div className="text-sm font-medium text-gray-400">
                  Rate
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">
                  {formatPercentage(analyticsData.students.conversion_rate)}
                </div>
                <div className="text-sm text-gray-400">
                  Conversion rate
                </div>
              </div>
            </div>

            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div className={`text-sm font-medium ${getChangeColor(-analyticsData.students.churn_rate)}`}>
                  {getChangeIcon(-analyticsData.students.churn_rate)} {formatPercentage(analyticsData.students.churn_rate)}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">
                  {formatPercentage(analyticsData.students.churn_rate)}
                </div>
                <div className="text-sm text-gray-400">
                  Churn rate
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue by Day Chart */}
            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Revenue by Day</h3>
              <div className="space-y-3">
                {analyticsData.revenue.by_day.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="text-sm text-gray-400 w-20">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-[#1F2D45] rounded-full h-2">
                        <div
                          className="bg-[#0F6E56] h-2 rounded-full"
                          style={{
                            width: `${Math.min((day.revenue / Math.max(...analyticsData.revenue.by_day.map(d => d.revenue))) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm text-white font-mono w-24 text-right">
                      {formatCurrency(day.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue by Course Chart */}
            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Revenue by Course</h3>
              <div className="space-y-3">
                {analyticsData.revenue.by_course.slice(0, 5).map((course, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="text-sm text-gray-400 flex-1 mr-4">
                      {course.course}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-[#1F2D45] rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min((course.amount / analyticsData.revenue.total_this_week) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm text-white font-mono w-24 text-right">
                      {formatCurrency(course.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Network Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Revenue by Network</h3>
              <div className="space-y-3">
                {analyticsData.revenue.by_network.map((network, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      {network.network}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-[#1F2D45] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            network.network === 'Airtel Money' ? 'bg-green-500' : 
                            network.network === 'TNM Mpamba' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}
                          style={{
                            width: `${Math.min((network.amount / analyticsData.revenue.total_this_week) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm text-white font-mono w-24 text-right">
                      {formatCurrency(network.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Performance */}
            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Top Lessons</h3>
              <div className="space-y-3">
                {analyticsData.content.most_watched_lessons.slice(0, 5).map((lesson, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-white">{lesson.title}</div>
                      <div className="text-xs text-gray-400">{lesson.course}</div>
                    </div>
                    <div className="text-sm text-white font-mono w-16 text-right">
                      {lesson.play_count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Health */}
            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Payment Health</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Failed Rate</span>
                  <span className={`text-sm font-mono ${
                    analyticsData.payment_health.failed_payment_rate > 5 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {formatPercentage(analyticsData.payment_health.failed_payment_rate)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Avg Confirmation</span>
                  <span className="text-sm font-mono text-white">
                    {analyticsData.payment_health.average_confirmation_time_seconds}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Stuck Payments</span>
                  <span className={`text-sm font-mono ${
                    analyticsData.payment_health.stuck_pending_payments > 0 ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {analyticsData.payment_health.stuck_pending_payments}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Course Completion Rates */}
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-6">Course Completion Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analyticsData.content.average_completion_rates.map((course, index) => (
                <div key={index} className="bg-[#1F2D45]/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium text-white">{course.course}</div>
                    <div className={`text-sm font-mono ${
                      course.completion_rate > 60 ? 'text-green-400' : 
                      course.completion_rate > 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {formatPercentage(course.completion_rate)}
                    </div>
                  </div>
                  <div className="w-full bg-[#1F2D45] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        course.completion_rate > 60 ? 'bg-green-500' : 
                        course.completion_rate > 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${course.completion_rate}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {course.completed_students}/{course.total_students} students
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Active Students */}
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-6">Most Active Students</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-[#1F2D45]">
                    <th className="pb-3">Student ID</th>
                    <th className="pb-3">Lessons Completed</th>
                    <th className="pb-3">Unique Courses</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.students.most_active_students.map((student, index) => (
                    <tr key={index} className="border-b border-[#1F2D45]/50">
                      <td className="py-3 text-gray-300 font-mono text-xs">
                        {student.user_id.slice(0, 8)}...
                      </td>
                      <td className="py-3 text-white font-mono">
                        {student.lessons_completed}
                      </td>
                      <td className="py-3 text-gray-300">
                        {student.unique_courses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drop-off Analysis */}
          {analyticsData.content.drop_off_point && (
            <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Drop-off Analysis</h3>
              <div className="bg-[#1F2D45]/30 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white font-medium">{analyticsData.content.drop_off_point.title}</div>
                    <div className="text-sm text-gray-400">{analyticsData.content.drop_off_point.course}</div>
                    <div className="text-sm text-gray-400">Lesson {analyticsData.content.drop_off_point.lesson_order}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-mono ${
                      analyticsData.content.drop_off_point.drop_off_rate > 50 ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {formatPercentage(analyticsData.content.drop_off_point.drop_off_rate)}
                    </div>
                    <div className="text-xs text-gray-400">drop-off rate</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {analyticsData.content.drop_off_point.total_views} views
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report Metadata */}
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-4">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <div>
                Report generated: {new Date(analyticsData.generated_at).toLocaleString()}
              </div>
              <div>
                Period: {new Date(analyticsData.report_period.current_week.start).toLocaleDateString()} - 
                {new Date(analyticsData.report_period.current_week.end).toLocaleDateString()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
