import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, requireAdmin, HTTPError } from '../_shared/auth.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/**
 * Admin analytics handler - Weekly business report
 */
export async function handler(req: Request): Promise<Response> {
  try {
    // Handle CORS preflight
    const corsResponse = corsMiddleware(req)
    if (corsResponse) {
      return corsResponse
    }

    // Require admin authentication
    const { user, profile, supabase: adminSupabase } = await requireAdmin(req)

    // Calculate date ranges
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Start of current week
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7) // End of current week
    
    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(weekStart.getDate() - 7) // Start of last week
    
    const lastWeekEnd = new Date(weekEnd)
    lastWeekEnd.setDate(weekEnd.getDate() - 7) // End of last week

    // Parallel queries for comprehensive analytics
    const [
      revenueData,
      studentData,
      contentData,
      paymentHealthData
    ] = await Promise.all([
      getRevenueAnalytics(weekStart, weekEnd, lastWeekStart, lastWeekEnd),
      getStudentAnalytics(weekStart, weekEnd),
      getContentAnalytics(weekStart, weekEnd),
      getPaymentHealthAnalytics(weekStart, weekEnd)
    ])

    return successResponse({
      report_period: {
        current_week: {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString()
        },
        last_week: {
          start: lastWeekStart.toISOString(),
          end: lastWeekEnd.toISOString()
        }
      },
      generated_at: new Date().toISOString(),
      ...revenueData,
      ...studentData,
      ...contentData,
      ...paymentHealthData
    })

  } catch (error) {
    return handleError(error)
  }
}

/**
 * Revenue analytics
 */
async function getRevenueAnalytics(
  weekStart: Date,
  weekEnd: Date,
  lastWeekStart: Date,
  lastWeekEnd: Date
) {
  // Current week revenue
  const { data: currentWeekRevenue } = await supabase
    .from('payments')
    .select('amount_mwk, created_at, courses!inner(title), phone_number')
    .eq('status', 'paid')
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString())

  // Last week revenue
  const { data: lastWeekRevenue } = await supabase
    .from('payments')
    .select('amount_mwk')
    .eq('status', 'paid')
    .gte('created_at', lastWeekStart.toISOString())
    .lt('created_at', lastWeekEnd.toISOString())

  // Calculate totals and change
  const currentWeekTotal = currentWeekRevenue?.reduce((sum, p) => sum + p.amount_mwk, 0) || 0
  const lastWeekTotal = lastWeekRevenue?.reduce((sum, p) => sum + p.amount_mwk, 0) || 0
  const revenueChange = lastWeekTotal > 0 ? ((currentWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0

  // Revenue by day
  const revenueByDay = []
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(weekStart)
    dayStart.setDate(weekStart.getDate() + i)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayStart.getDate() + 1)
    
    const dayRevenue = currentWeekRevenue?.filter(p => {
      const paymentDate = new Date(p.created_at)
      return paymentDate >= dayStart && paymentDate < dayEnd
    }).reduce((sum, p) => sum + p.amount_mwk, 0) || 0
    
    revenueByDay.push({
      date: dayStart.toISOString().split('T')[0],
      revenue: dayRevenue
    })
  }

  // Revenue by course
  const revenueByCourse = currentWeekRevenue?.reduce((acc, payment) => {
    const courseTitle = payment.courses?.title || 'Unknown'
    acc[courseTitle] = (acc[courseTitle] || 0) + payment.amount_mwk
    return acc
  }, {} as Record<string, number>) || {}

  // Revenue by network (detect from phone number)
  const revenueByNetwork = currentWeekRevenue?.reduce((acc, payment) => {
    const network = detectNetwork(payment.phone_number)
    acc[network] = (acc[network] || 0) + payment.amount_mwk
    return acc
  }, { 'Airtel Money': 0, 'TNM Mpamba': 0, 'Unknown': 0 }) || { 'Airtel Money': 0, 'TNM Mpamba': 0, 'Unknown': 0 }

  return {
    revenue: {
      total_this_week: currentWeekTotal,
      total_last_week: lastWeekTotal,
      change_percentage: Math.round(revenueChange * 100) / 100,
      by_day: revenueByDay,
      by_course: Object.entries(revenueByCourse)
        .sort(([,a], [,b]) => b - a)
        .map(([course, amount]) => ({ course, amount })),
      by_network: Object.entries(revenueByNetwork)
        .map(([network, amount]) => ({ network, amount }))
    }
  }
}

/**
 * Student analytics
 */
async function getStudentAnalytics(weekStart: Date, weekEnd: Date) {
  // New registrations this week
  const { data: newRegistrations } = await supabase
    .from('profiles')
    .select('id, created_at')
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString())

  // Total registered users
  const { data: totalUsers } = await supabase
    .from('profiles')
    .select('id, created_at')

  // Users with payments (paid users)
  const { data: paidUsers } = await supabase
    .from('profiles')
    .select('id')
    .in('id', 
      supabase.from('payments').select('user_id').eq('status', 'paid')
    )

  // Expiring enrollments (next 7 days)
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  
  const { data: expiringEnrollments } = await supabase
    .from('enrollments')
    .select('user_id, expires_at, courses!inner(title)')
    .eq('status', 'active')
    .lte('expires_at', sevenDaysFromNow.toISOString())
    .gt('expires_at', new Date().toISOString())

  // Churn calculation (enrollments not renewed after expiry)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: expiredEnrollments } = await supabase
    .from('enrollments')
    .select('user_id, course_id, expires_at')
    .eq('status', 'active')
    .lt('expires_at', thirtyDaysAgo.toISOString())

  const { data: renewedEnrollments } = await supabase
    .from('enrollments')
    .select('user_id, course_id')
    .in('user_id', expiredEnrollments?.map(e => e.user_id) || [])
    .eq('status', 'active')
    .gt('expires_at', thirtyDaysAgo.toISOString())

  const churnedUsers = expiredEnrollments?.filter(expired => 
    !renewedEnrollments?.some(renewed => 
      renewed.user_id === expired.user_id && renewed.course_id === expired.course_id
    )
  ).length || 0

  const totalExpiredEnrollments = expiredEnrollments?.length || 0
  const churnRate = totalExpiredEnrollments > 0 ? (churnedUsers / totalExpiredEnrollments) * 100 : 0

  // Most active students (by lessons completed)
  const { data: topStudents } = await supabase
    .from('progress')
    .select('user_id, completed_at, videos!inner(courses!inner(title))')
    .eq('completed', true)
    .gte('completed_at', weekStart.toISOString())
    .lt('completed_at', weekEnd.toISOString())
    .then(result => {
      const studentActivity = result.data?.reduce((acc, progress) => {
        const studentId = progress.user_id
        const courseTitle = progress.videos?.courses?.title || 'Unknown'
        acc[studentId] = (acc[studentId] || { count: 0, courses: [] })
        acc[studentId].count++
        if (!acc[studentId].courses.includes(courseTitle)) {
          acc[studentId].courses.push(courseTitle)
        }
        return acc
      }, {} as Record<string, { count: number; courses: string[] }>) || {}
      
      return Object.entries(studentActivity)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
        .map(([userId, data]) => ({
          user_id: userId,
          lessons_completed: data.count,
          unique_courses: data.courses.length
        }))
    })

  const conversionRate = totalUsers?.length > 0 ? (paidUsers?.length / totalUsers.length) * 100 : 0

  return {
    students: {
      new_registrations_this_week: newRegistrations?.length || 0,
      total_registered: totalUsers?.length || 0,
      total_paid_users: paidUsers?.length || 0,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      churn_rate: Math.round(churnRate * 100) / 100,
      expiring_enrollments_next_7_days: expiringEnrollments?.length || 0,
      most_active_students: topStudents || []
    }
  }
}

/**
 * Content analytics
 */
async function getContentAnalytics(weekStart: Date, weekEnd: Date) {
  // Most watched lessons (by play count)
  const { data: lessonPlays } = await supabase
    .from('progress')
    .select('video_id, videos!inner(title, courses!inner(title))')
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString())

  const mostWatchedLessons = lessonPlays?.reduce((acc, progress) => {
    const lessonId = progress.video_id
    const lessonTitle = progress.videos?.title || 'Unknown'
    const courseTitle = progress.videos?.courses?.title || 'Unknown'
    acc[lessonId] = (acc[lessonId] || { 
      title: lessonTitle, 
      course: courseTitle, 
      play_count: 0 
    })
    acc[lessonId].play_count++
    return acc
  }, {} as Record<string, { title: string; course: string; play_count: number }>) || {}

  // Average completion rate per course
  const { data: courseCompletion } = await supabase
    .from('courses')
    .select('id, title, videos!inner(id)')

  const completionRates = await Promise.all(
    courseCompletion?.map(async (course) => {
      const totalVideos = course.videos?.length || 0
      if (totalVideos === 0) return { course: course.title, completion_rate: 0 }

      const { data: completions } = await supabase
        .from('progress')
        .select('user_id, video_id, completed')
        .eq('completed', true)
        .in('video_id', course.videos?.map(v => v.id) || [])

      const userProgress = completions?.reduce((acc, progress) => {
        const userId = progress.user_id
        acc[userId] = (acc[userId] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const completedUsers = Object.values(userProgress).filter(count => count === totalVideos).length
      const totalUsers = Object.keys(userProgress).length
      
      const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0

      return {
        course: course.title,
        completion_rate: Math.round(completionRate * 100) / 100,
        total_students: totalUsers,
        completed_students: completedUsers
      }
    }) || []
  )

  // Drop-off point analysis
  const { data: dropOffData } = await supabase
    .from('videos')
    .select('id, title, lesson_order, courses!inner(title)')
    .eq('published', true)
    .order('lesson_order', { ascending: true })

  const dropOffAnalysis = await Promise.all(
    dropOffData?.map(async (video) => {
      const { data: videoProgress } = await supabase
        .from('progress')
        .select('user_id, completed, seconds_watched')
        .eq('video_id', video.id)

      const totalViews = videoProgress?.length || 0
      const completedViews = videoProgress?.filter(p => p.completed).length || 0
      const averageWatchTime = videoProgress?.reduce((sum, p) => sum + (p.seconds_watched || 0), 0) / totalViews || 0

      return {
        video_id: video.id,
        title: video.title,
        course: video.courses?.title,
        lesson_order: video.lesson_order,
        total_views: totalViews,
        completion_rate: totalViews > 0 ? (completedViews / totalViews) * 100 : 0,
        average_watch_time: averageWatchTime,
        drop_off_rate: totalViews > 0 ? ((totalViews - completedViews) / totalViews) * 100 : 0
      }
    }) || []
  )

  // Find the drop-off point (lesson with highest drop-off rate)
  const dropOffPoint = dropOffAnalysis
    .filter(video => video.total_views >= 5) // Only consider videos with meaningful views
    .sort((a, b) => b.drop_off_rate - a.drop_off_rate)[0]

  return {
    content: {
      most_watched_lessons: Object.entries(mostWatchedLessons)
        .sort(([,a], [,b]) => b.play_count - a.play_count)
        .slice(0, 10)
        .map(([id, data]) => ({
          video_id: id,
          title: data.title,
          course: data.course,
          play_count: data.play_count
        })),
      average_completion_rates: completionRates.sort((a, b) => b.completion_rate - a.completion_rate),
      drop_off_point: dropOffPoint || null
    }
  }
}

/**
 * Payment health analytics
 */
async function getPaymentHealthAnalytics(weekStart: Date, weekEnd: Date) {
  // Failed payment rate
  const { data: allPayments } = await supabase
    .from('payments')
    .select('status, created_at, updated_at')
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString())

  const failedPayments = allPayments?.filter(p => p.status === 'failed').length || 0
  const totalPayments = allPayments?.length || 0
  const failedPaymentRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0

  // Average payment confirmation time
  const { data: successfulPayments } = await supabase
    .from('payments')
    .select('created_at, updated_at')
    .eq('status', 'paid')
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString())

  const confirmationTimes = successfulPayments?.map(payment => {
    const created = new Date(payment.created_at)
    const updated = new Date(payment.updated_at)
    return (updated.getTime() - created.getTime()) / 1000 // Convert to seconds
  }) || []

  const averageConfirmationTime = confirmationTimes.length > 0
    ? confirmationTimes.reduce((sum, time) => sum + time, 0) / confirmationTimes.length
    : 0

  // Pending payments stuck > 1 hour
  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)

  const { data: stuckPendingPayments } = await supabase
    .from('payments')
    .select('id, tx_ref, created_at, user_id, courses!inner(title)')
    .eq('status', 'pending')
    .lt('created_at', oneHourAgo.toISOString())

  return {
    payment_health: {
      failed_payment_rate: Math.round(failedPaymentRate * 100) / 100,
      average_confirmation_time_seconds: Math.round(averageConfirmationTime * 100) / 100,
      stuck_pending_payments: stuckPendingPayments?.length || 0,
      stuck_payment_details: stuckPendingPayments?.map(p => ({
        payment_id: p.id,
        tx_ref: p.tx_ref,
        stuck_hours: Math.round((new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60) * 10) / 10,
        course: p.courses?.title
      })) || []
    }
  }
}

/**
 * Detect mobile money network from phone number
 */
function detectNetwork(phoneNumber: string): string {
  if (!phoneNumber) return 'Unknown'
  
  const cleanNumber = phoneNumber.replace(/\D/g, '')
  
  // Airtel Money prefixes (Malawi)
  const airtelPrefixes = ['088', '099', '098']
  // TNM Mpamba prefixes (Malawi)
  const tnmPrefixes = ['095', '096', '097', '091', '090']
  
  if (airtelPrefixes.some(prefix => cleanNumber.startsWith(prefix))) {
    return 'Airtel Money'
  } else if (tnmPrefixes.some(prefix => cleanNumber.startsWith(prefix))) {
    return 'TNM Mpamba'
  }
  
  return 'Unknown'
}

// Deno.serve(handler) // Commented out for IDE compatibility
