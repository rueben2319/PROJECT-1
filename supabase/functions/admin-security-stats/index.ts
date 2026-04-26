import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, requireAdmin, HTTPError } from '../_shared/auth.ts'
import { handleError, successResponse } from '../_shared/template.ts'

/**
 * Admin security statistics handler
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

    // Calculate time ranges
    const now = new Date()
    const twentyFourHoursAgo = new Date(now)
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Parallel queries for security stats
    const [
      failedLoginsResult,
      webhookFailuresResult,
      paymentMismatchesResult,
      activeSessionsResult
    ] = await Promise.all([
      // Failed logins in last 24 hours
      supabase
        .from('audit_log')
        .select('id')
        .eq('action', 'login_failed')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .count('exact'),

      // Webhook signature failures
      supabase
        .from('audit_log')
        .select('id')
        .eq('action', 'webhook_signature_failed')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .count('exact'),

      // Payment mismatches
      supabase
        .from('audit_log')
        .select('id')
        .eq('action', 'payment_mismatch')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .count('exact'),

      // Active sessions (users who logged in last 24 hours)
      supabase
        .from('audit_log')
        .select('user_id')
        .eq('action', 'user.login')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .then(result => {
          // Count unique users
          const uniqueUsers = new Set(result.data?.map(log => log.user_id) || [])
          return { count: uniqueUsers.size }
        })
    ])

    // Extract counts (handle potential null values)
    const failedLogins24h = failedLoginsResult.count || 0
    const webhookSigFailures = webhookFailuresResult.count || 0
    const paymentMismatches = paymentMismatchesResult.count || 0
    const activeSessions = activeSessionsResult.count || 0

    return successResponse({
      failed_logins_24h: failedLogins24h,
      webhook_sig_failures: webhookSigFailures,
      payment_mismatches: paymentMismatches,
      active_sessions: activeSessions
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
