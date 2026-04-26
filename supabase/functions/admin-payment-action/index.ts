import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, requireAdmin, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Validation schema
const paymentActionSchema = z.object({
  tx_ref: z.string().min(1),
  action: z.enum(['grant', 'fail'])
})

/**
 * Admin payment action handler
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

    // Validate input
    const body = await req.json()
    const validatedData = await validateInput(body, paymentActionSchema) as z.infer<typeof paymentActionSchema>

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        courses!inner(id, title),
        profiles!inner(full_name, email)
      `)
      .eq('tx_ref', validatedData.tx_ref)
      .single()

    if (paymentError || !payment) {
      throw new HTTPError(404, 'Payment not found', 'PAYMENT_NOT_FOUND')
    }

    // Only act on pending payments
    if (payment.status !== 'pending') {
      throw new HTTPError(400, 'Payment is not in pending status', 'INVALID_STATUS')
    }

    if (validatedData.action === 'grant') {
      // Grant payment: update to paid and create enrollment
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        throw new HTTPError(500, 'Failed to update payment', 'PAYMENT_UPDATE_ERROR')
      }

      // Create or update enrollment
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .upsert({
          user_id: payment.user_id,
          course_id: payment.course_id,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,course_id'
        })

      if (enrollmentError) {
        throw new HTTPError(500, 'Failed to create enrollment', 'ENROLLMENT_ERROR')
      }

      // Log audit event
      await logAudit({
        user_id: user.id,
        action: AUDIT_EVENTS.ADMIN_MANUAL_GRANT,
        resource: 'payment',
        resource_id: payment.id,
        details: {
          tx_ref: validatedData.tx_ref,
          student_name: payment.profiles?.full_name,
          student_email: payment.profiles?.email,
          course_title: payment.courses?.title,
          amount_mwk: payment.amount_mwk,
          expires_at: expiresAt.toISOString()
        }
      })

      return successResponse({
        success: true,
        action: 'granted',
        message: 'Payment granted and enrollment created',
        enrollment_expires_at: expiresAt.toISOString()
      })

    } else if (validatedData.action === 'fail') {
      // Fail payment: update to failed
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        throw new HTTPError(500, 'Failed to update payment', 'PAYMENT_UPDATE_ERROR')
      }

      // Log audit event
      await logAudit({
        user_id: user.id,
        action: AUDIT_EVENTS.ADMIN_MANUAL_FAIL,
        resource: 'payment',
        resource_id: payment.id,
        details: {
          tx_ref: validatedData.tx_ref,
          student_name: payment.profiles?.full_name,
          student_email: payment.profiles?.email,
          course_title: payment.courses?.title,
          amount_mwk: payment.amount_mwk
        }
      })

      return successResponse({
        success: true,
        action: 'failed',
        message: 'Payment marked as failed'
      })

    } else {
      throw new HTTPError(400, 'Invalid action', 'INVALID_ACTION')
    }

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
