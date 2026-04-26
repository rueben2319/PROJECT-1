import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Validation schema
const paymentStatusSchema = z.object({
  tx_ref: z.string().min(1)
})

/**
 * Get payment status for frontend polling
 */
export async function handler(req: Request): Promise<Response> {
  try {
    // Handle CORS preflight
    const corsResponse = corsMiddleware(req)
    if (corsResponse) {
      return corsResponse
    }

    // Require authentication
    const { user, profile, supabase } = await requireAuth(req)

    // Validate query parameters
    const url = new URL(req.url)
    const queryParams = {
      tx_ref: url.searchParams.get('tx_ref')
    }
    
    const validatedParams = await validateInput(queryParams, paymentStatusSchema) as z.infer<typeof paymentStatusSchema>

    // Fetch payment with enrollment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        courses (
          id,
          title,
          subject,
          grade
        ),
        enrollments (
          id,
          expires_at,
          status
        )
      `)
      .eq('tx_ref', validatedParams.tx_ref)
      .eq('user_id', user.id)
      .single()

    if (paymentError || !payment) {
      throw new HTTPError(404, 'Payment not found', 'PAYMENT_NOT_FOUND')
    }

    // Calculate enrollment status
    let enrollmentStatus = null
    if (payment.enrollments && payment.enrollments.length > 0) {
      const enrollment = payment.enrollments[0]
      const now = new Date()
      const expiresAt = new Date(enrollment.expires_at)
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      enrollmentStatus = {
        id: enrollment.id,
        expires_at: enrollment.expires_at,
        status: enrollment.status,
        days_remaining: Math.max(0, daysRemaining),
        is_active: enrollment.status === 'active' && daysRemaining > 0
      }
    }

    // Prepare response
    const response = {
      tx_ref: payment.tx_ref,
      status: payment.status,
      amount_mwk: payment.amount_mwk,
      phone_number: payment.phone_number,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      course: payment.courses,
      enrollment: enrollmentStatus
    }

    // Log audit event for payment status checks
    if (payment.status === 'paid') {
      await logAudit({
        user_id: user.id,
        action: AUDIT_EVENTS.PAYMENT_SUCCESS,
        resource: 'payment',
        resource_id: payment.id,
        details: {
          tx_ref: payment.tx_ref,
          course_id: payment.course_id,
          status_check: true
        }
      })
    }

    return successResponse(response)

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
