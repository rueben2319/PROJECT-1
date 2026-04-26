import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { rateLimiters } from '../_shared/rateLimit.ts'
import { z } from 'jsr:@zod/zod@3.22.4'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Validation schema
const createPaymentSchema = z.object({
  course_id: z.string().uuid(),
  phone_number: z.string().regex(/^(08|09)\d{8}$/, 'Invalid Malawi phone number')
})

// PayChangu configuration
const PAYCHANGU_API_URL = 'https://api.paychangu.com'
const PAYCHANGU_SECRET_KEY = Deno.env.get('PAYCHANGU_SECRET_KEY')!
const PAYCHANGU_PUBLIC_KEY = Deno.env.get('PAYCHANGU_PUBLIC_KEY')!

/**
 * Create payment request
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

    // Apply rate limiting
    await rateLimiters.paymentCreation(req, user.id)

    // Validate input
    const body = await req.json()
    const validatedData = await validateInput(body, createPaymentSchema) as z.infer<typeof createPaymentSchema>

    // Fetch course details to get price (NEVER trust frontend)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price_mwk, published')
      .eq('id', validatedData.course_id)
      .single()

    if (courseError || !course) {
      throw new HTTPError(404, 'Course not found', 'COURSE_NOT_FOUND')
    }

    if (!course.published) {
      throw new HTTPError(400, 'Course not available', 'COURSE_NOT_PUBLISHED')
    }

    // Check if user already has active enrollment
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id, expires_at')
      .eq('user_id', user.id)
      .eq('course_id', validatedData.course_id)
      .eq('status', 'active')
      .single()

    if (existingEnrollment && new Date(existingEnrollment.expires_at) > new Date()) {
      throw new HTTPError(400, 'You already have active access to this course', 'ALREADY_ENROLLED')
    }

    // Generate transaction reference
    const timestamp = Date.now()
    const uuid = crypto.randomUUID().slice(0, 8)
    const txRef = `MSCE-${timestamp}-${uuid}`

    // Create payment record BEFORE calling PayChangu
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tx_ref: txRef,
        user_id: user.id,
        course_id: validatedData.course_id,
        amount_mwk: course.price_mwk,
        phone_number: validatedData.phone_number,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError || !payment) {
      throw new HTTPError(500, 'Failed to create payment record', 'PAYMENT_CREATE_ERROR')
    }

    // Call PayChangu API
    const paychanguPayload = {
      tx_ref: txRef,
      amount: course.price_mwk,
      currency: 'MWK',
      email: user.email || `${user.id}@msce-learn.com`,
      phone_number: validatedData.phone_number,
      title: `MSCE Learn - ${course.title}`,
      description: `30 days access to ${course.title}`,
      callback_url: `${Deno.env.get('APP_URL')}/api/payment-callback`,
      return_url: `${Deno.env.get('APP_URL')}/payment/status?tx_ref=${txRef}`,
      meta: {
        user_id: user.id,
        course_id: validatedData.course_id,
        payment_id: payment.id
      }
    }

    const paychanguResponse = await fetch(`${PAYCHANGU_API_URL}/payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paychanguPayload)
    })

    if (!paychanguResponse.ok) {
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', payment.id)

      throw new HTTPError(500, 'Failed to initiate payment', 'PAYCHANGU_ERROR')
    }

    const paychanguData = await paychanguResponse.json()

    // Log audit event
    await logAudit({
      user_id: user.id,
      action: AUDIT_EVENTS.PAYMENT_INITIATED,
      resource: 'payment',
      resource_id: payment.id,
      details: {
        tx_ref: txRef,
        course_id: validatedData.course_id,
        amount_mwk: course.price_mwk,
        phone_number: validatedData.phone_number
      }
    })

    return successResponse({
      tx_ref: txRef,
      payment_url: paychanguData.data?.checkout_url || null,
      amount: course.price_mwk,
      course_title: course.title
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
