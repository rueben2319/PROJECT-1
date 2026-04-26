import { corsHeaders, corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, requireAdmin, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Validation schema for query parameters
const statsSchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional().default('month'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
})

/**
 * Get admin statistics
 */
export async function handler(req: Request): Promise<Response> {
  try {
    // Handle CORS preflight
    const corsResponse = corsMiddleware(req)
    if (corsResponse) {
      return corsResponse
    }

    // Require admin authentication
    const { user, profile, supabase } = await requireAdmin(req)

    // Validate input (query parameters)
    const url = new URL(req.url)
    const inputData = { 
      period: url.searchParams.get('period') || 'month',
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date')
    }
    const validatedData = await validateInput(inputData, statsSchema) as z.infer<typeof statsSchema>

    // Business logic - fetch statistics
    const stats = await fetchAdminStats(supabase, validatedData, user.id)

    // Log audit event
    await logAudit({
      user_id: user.id,
      action: AUDIT_EVENTS.ADMIN_STATS_VIEWED,
      resource: 'admin_dashboard',
      details: {
        period: validatedData.period,
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      }
    })

    // Return success response
    return successResponse(stats)

  } catch (error) {
    return handleError(error)
  }
}

/**
 * Fetch admin statistics from database
 */
async function fetchAdminStats(
  supabase: any,
  params: z.infer<typeof statsSchema>,
  adminUserId?: string
) {
  const { period, start_date, end_date } = params

  // Calculate date range for different metrics
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  // Seven days ago for revenue chart
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Parallel data fetching using Promise.all
  const [
    revenueResult,
    activeEnrollmentsResult,
    pendingPaymentsResult,
    expiringSoonResult,
    revenueChartResult,
    enrollmentsBySubjectResult,
    recentTransactionsResult,
    activityFeedResult
  ] = await Promise.all([
    // Revenue (last 30 days)
    supabase
      .from('payments')
      .select('amount_mwk')
      .eq('status', 'paid')
      .gte('created_at', thirtyDaysAgo.toISOString()),

    // Active enrollments
    supabase
      .from('enrollments')
      .select('id')
      .eq('status', 'active')
      .gt('expires_at', now.toISOString()),

    // Pending payments
    supabase
      .from('payments')
      .select('id')
      .eq('status', 'pending'),

    // Expiring in 3 days
    supabase
      .from('enrollments')
      .select('id')
      .eq('status', 'active')
      .lte('expires_at', threeDaysFromNow.toISOString())
      .gt('expires_at', now.toISOString()),

    // Revenue chart (last 7 days grouped by day)
    supabase
      .from('payments')
      .select('amount_mwk, created_at')
      .eq('status', 'paid')
      .gte('created_at', sevenDaysAgo.toISOString()),

    // Enrollments by subject
    supabase
      .from('enrollments')
      .select(`
        courses!inner(subject)
      `)
      .eq('status', 'active'),

    // Recent transactions
    supabase
      .from('payments')
      .select(`
        amount_mwk,
        status,
        created_at,
        phone_number,
        profiles!inner(full_name),
        courses!inner(title)
      `)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(10),

    // Activity feed (last 10 audit events)
    supabase
      .from('audit_log')
      .select('action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  // Process results
  const revenue = revenueResult.data?.reduce((sum: number, p: any) => sum + (p.amount_mwk || 0), 0) || 0
  const activeEnrollments = activeEnrollmentsResult.data?.length || 0
  const pendingPayments = pendingPaymentsResult.data?.length || 0
  const expiringSoon = expiringSoonResult.data?.length || 0

  // Convert MWK to USD (approximate rate: 1 USD = 1750 MWK)
  const usdRate = 1750
  const revenueUSD = revenue / usdRate

  // Process revenue chart data
  const revenueChart = processRevenueChart(revenueChartResult.data || [])

  // Process enrollments by subject
  const enrollmentsBySubject = processEnrollmentsBySubject(enrollmentsBySubjectResult.data || [])

  // Process recent transactions
  const recentTransactions = (recentTransactionsResult.data || []).map((tx: any) => ({
    student_name: tx.profiles?.full_name || 'Unknown',
    course_title: tx.courses?.title || 'Unknown',
    amount_mwk: tx.amount_mwk,
    status: tx.status,
    network: tx.phone_number?.startsWith('088') || tx.phone_number?.startsWith('099') ? 'Airtel' : 'TNM Mpamba',
    created_at: tx.created_at
  }))

  // Process activity feed
  const activityFeed = (activityFeedResult.data || []).map((event: any) => ({
    message: getEventMessage(event.action, event.details),
    type: getEventType(event.action),
    created_at: event.created_at
  }))

  const securityAlerts = await fetchRecentSecurityAlerts(supabase, adminUserId)

  return {
    revenue: {
      mwk: revenue,
      usd: revenueUSD
    },
    active_enrollments: activeEnrollments,
    pending_payments: pendingPayments,
    expiring_soon: expiringSoon,
    revenue_chart: revenueChart,
    enrollments_by_subject: enrollmentsBySubject,
    recent_transactions: recentTransactions,
    activity_feed: activityFeed,
    system_status: 'healthy',
    security_alerts: securityAlerts
  }
}

/**
 * Count recent security-relevant audit events
 */
async function fetchRecentSecurityAlerts(supabase: any, adminUserId?: string): Promise<number> {
  const securityEventActions = [
    'login_failed',
    'webhook_signature_failed',
    'payment_mismatch'
  ]

  const since = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString()

  try {
    const { count, error } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .in('action', securityEventActions)
      .gte('created_at', since)

    if (error) {
      await logAudit({
        user_id: adminUserId,
        event: AUDIT_EVENTS.SYSTEM_ERROR,
        resource_type: 'admin_dashboard',
        details: {
          operation: 'fetch_recent_security_alerts',
          window_hours: 24,
          table: 'audit_log',
          actions: securityEventActions,
          message: error.message
        }
      })
      return 0
    }

    return count || 0
  } catch (error) {
    await logAudit({
      user_id: adminUserId,
      event: AUDIT_EVENTS.SYSTEM_ERROR,
      resource_type: 'admin_dashboard',
      details: {
        operation: 'fetch_recent_security_alerts',
        window_hours: 24,
        table: 'audit_log',
        actions: securityEventActions,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    })
    return 0
  }
}

/**
 * Process revenue chart data into daily format
 */
function processRevenueChart(payments: any[]) {
  const dailyRevenue: Record<string, number> = {}
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    dailyRevenue[dateStr] = 0
  }

  // Sum revenue by day
  payments.forEach(payment => {
    const dateStr = new Date(payment.created_at).toISOString().split('T')[0]
    if (dailyRevenue.hasOwnProperty(dateStr)) {
      dailyRevenue[dateStr] += payment.amount_mwk || 0
    }
  })

  // Convert to array format
  return Object.entries(dailyRevenue).map(([date, revenue]) => ({
    date,
    revenue_mwk: revenue
  }))
}

/**
 * Process enrollments by subject
 */
function processEnrollmentsBySubject(enrollments: any[]) {
  const subjectCounts: Record<string, number> = {}
  
  enrollments.forEach(enrollment => {
    const subject = enrollment.courses?.subject || 'Unknown'
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1
  })

  return Object.entries(subjectCounts).map(([subject, count]) => ({
    subject,
    count
  })).sort((a, b) => b.count - a.count)
}

/**
 * Get human-readable event message
 */
function getEventMessage(action: string, details: any) {
  switch (action) {
    case 'user.login':
      return `User logged in: ${details.email || 'Unknown'}`
    case 'payment.success':
      return `Payment completed: ${details.course_title || 'Course'}`
    case 'payment.failed':
      return `Payment failed: ${details.course_title || 'Course'}`
    case 'course.access_granted':
      return `Course access granted: ${details.course_title || 'Course'}`
    case 'admin.stats_viewed':
      return 'Admin dashboard accessed'
    default:
      return `System event: ${action}`
  }
}

/**
 * Get event type for coloring
 */
function getEventType(action: string): 'success' | 'warning' | 'error' | 'info' {
  if (action.includes('success') || action.includes('completed')) return 'success'
  if (action.includes('failed') || action.includes('error')) return 'error'
  if (action.includes('pending') || action.includes('warning')) return 'warning'
  return 'info'
}

// Deno.serve(handler) // Commented out for IDE compatibility
