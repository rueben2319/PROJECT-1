import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, requireAdmin, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Validation schema
const featureFlagSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean()
})

/**
 * Admin feature flag handler
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
    const validatedData = await validateInput(body, featureFlagSchema) as z.infer<typeof featureFlagSchema>

    // Update feature flag
    const { data: flag, error: flagError } = await supabase
      .from('feature_flags')
      .upsert({
        key: validatedData.key,
        enabled: validatedData.enabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })
      .select()
      .single()

    if (flagError) {
      throw new HTTPError(500, 'Failed to update feature flag', 'FLAG_UPDATE_ERROR')
    }

    // Log audit event
    await logAudit({
      user_id: user.id,
      action: AUDIT_EVENTS.FEATURE_FLAG_CHANGED,
      resource: 'feature_flag',
      resource_id: flag.id,
      details: {
        key: validatedData.key,
        previous_value: !validatedData.enabled,
        new_value: validatedData.enabled
      }
    })

    return successResponse({
      success: true,
      feature_flag: flag,
      message: `Feature flag ${validatedData.key} ${validatedData.enabled ? 'enabled' : 'disabled'}`
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
