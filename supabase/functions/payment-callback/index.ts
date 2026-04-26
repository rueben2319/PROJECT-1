import { corsMiddleware } from '../_shared/cors.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { successResponse, errorResponse } from '../_shared/template.ts'
import { timingSafeEqual } from 'jsr:@std/crypto@1.0.0/timing-safe-equal'

// PayChangu configuration
const PAYCHANGU_SECRET_KEY = Deno.env.get('PAYCHANGU_SECRET_KEY')!
const PAYCHANGU_API_URL = 'https://api.paychangu.com'

/**
 * Payment webhook handler - 4-step verification process
 */
export async function handler(req: Request): Promise<Response> {
  try {
    // Handle CORS preflight
    const corsResponse = corsMiddleware(req)
    if (corsResponse) {
      return corsResponse
    }

    // Get raw body for HMAC verification
    const rawBody = await req.text()
    const signature = req.headers.get('x-paychangu-signature')

    if (!signature) {
      console.error('Missing PayChangu signature')
      return errorResponse('Missing signature', 400)
    }

    // STEP 1: HMAC timingSafeEqual verification
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(PAYCHANGU_SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    )

    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      new TextEncoder().encode(rawBody)
    )

    const providedSignature = new TextEncoder().encode(signature)
    
    // Use timingSafeEqual to prevent timing attacks
    if (!timingSafeEqual(new Uint8Array(expectedSignature), providedSignature)) {
      console.error('Invalid PayChangu signature')
      await logSecurityEvent('invalid_signature', { signature, bodyLength: rawBody.length })
      return errorResponse('Invalid signature', 401)
    }

    // Parse webhook data
    let webhookData
    try {
      webhookData = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('Invalid webhook JSON:', parseError)
      await logSecurityEvent('invalid_json', { bodyLength: rawBody.length })
      return errorResponse('Invalid JSON', 400)
    }

    const { tx_ref, status, amount, currency } = webhookData

    if (!tx_ref || !status) {
      console.error('Missing required webhook fields')
      await logSecurityEvent('missing_fields', { tx_ref, status })
      return errorResponse('Missing required fields', 400)
    }

    // STEP 2: Re-fetch transaction from PayChangu API
    const paychanguResponse = await fetch(`${PAYCHANGU_API_URL}/payment/${tx_ref}`, {
      headers: {
        'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`
      }
    })

    if (!paychanguResponse.ok) {
      console.error('Failed to verify transaction with PayChangu')
      await logSecurityEvent('paychangu_verify_failed', { tx_ref })
      return errorResponse('Verification failed', 500)
    }

    const paychanguData = await paychanguResponse.json()
    
    if (!paychanguData.success || paychanguData.data?.status !== status) {
      console.error('PayChangu status mismatch')
      await logSecurityEvent('status_mismatch', { 
        webhook_status: status, 
        paychangu_status: paychanguData.data?.status 
      })
      return errorResponse('Status verification failed', 400)
    }

    // STEP 3: Verify amount matches database record
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, user_id, course_id, amount_mwk, status')
      .eq('tx_ref', tx_ref)
      .single()

    if (paymentError || !payment) {
      console.error('Payment record not found:', tx_ref)
      await logSecurityEvent('payment_not_found', { tx_ref })
      return errorResponse('Payment not found', 404)
    }

    if (payment.amount_mwk !== amount) {
      console.error('Amount mismatch:', { expected: payment.amount_mwk, received: amount })
      await logSecurityEvent('amount_mismatch', { 
        tx_ref, 
        expected: payment.amount_mwk, 
        received: amount 
      })
      return errorResponse('Amount verification failed', 400)
    }

    // STEP 4: Idempotency check
    if (payment.status === 'paid') {
      console.log('Payment already processed - idempotent request')
      return successResponse({ message: 'Already processed' })
    }

    // All verifications passed - process the payment
    if (status === 'paid') {
      // Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        console.error('Failed to update payment status:', updateError)
        throw updateError
      }

      // Create or update enrollment (30 days access)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

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
        console.error('Failed to create enrollment:', enrollmentError)
        throw enrollmentError
      }

      // Log successful payment
      await logAudit({
        user_id: payment.user_id,
        action: AUDIT_EVENTS.PAYMENT_SUCCESS,
        resource: 'payment',
        resource_id: payment.id,
        details: {
          tx_ref,
          course_id: payment.course_id,
          amount_mwk: payment.amount_mwk,
          expires_at: expiresAt.toISOString()
        }
      })

      console.log('Payment processed successfully:', tx_ref)

    } else if (status === 'failed' || status === 'cancelled') {
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      // Log failed payment
      await logAudit({
        user_id: payment.user_id,
        action: AUDIT_EVENTS.PAYMENT_FAILED,
        resource: 'payment',
        resource_id: payment.id,
        details: {
          tx_ref,
          course_id: payment.course_id,
          amount_mwk: payment.amount_mwk,
          status
        }
      })

      console.log('Payment marked as failed:', tx_ref)
    }

    // ALWAYS return HTTP 200 to PayChangu to prevent retries
    return successResponse({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    // Log security event for unexpected errors
    await logSecurityEvent('webhook_error', { 
      error: error.message,
      stack: error.stack 
    })

    // ALWAYS return HTTP 200 to PayChangu even on error
    return successResponse({ received: true })
  }
}

/**
 * Log security events for monitoring
 */
async function logSecurityEvent(event: string, details: Record<string, any>) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase
      .from('audit_log')
      .insert({
        user_id: 'system',
        action: 'security_alert',
        resource: 'payment_webhook',
        details: {
          event,
          ...details,
          timestamp: new Date().toISOString()
        }
      })
  } catch (logError) {
    console.error('Failed to log security event:', logError)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
