import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, requireAdmin, HTTPError } from '../_shared/auth.ts'
import { handleError } from '../_shared/template.ts'

/**
 * Admin export audit log handler
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

    // Parse query parameters
    const url = new URL(req.url)
    const eventType = url.searchParams.get('event_type')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    // Build query
    let query = supabase
      .from('audit_log')
      .select('created_at, action, user_id, details')
      .order('created_at', { ascending: false })
      .limit(10000) // Limit to 10,000 most recent records

    // Apply filters
    if (eventType) {
      query = query.eq('action', eventType)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: auditEvents, error } = await query

    if (error) {
      throw new HTTPError(500, 'Failed to fetch audit log', 'AUDIT_FETCH_ERROR')
    }

    // Convert to CSV
    const csvHeaders = ['created_at', 'event_type', 'user_id', 'details']
    const csvRows = auditEvents.map(event => [
      event.created_at,
      event.action,
      event.user_id || '',
      JSON.stringify(event.details || {})
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Return CSV file
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
