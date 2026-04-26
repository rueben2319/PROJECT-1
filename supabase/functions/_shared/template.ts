/**
 * Standard Edge Function Template
 * 
 * All Edge Functions must follow this pattern:
 * OPTIONS → preflight → requireAuth → validateInput → business logic → logAudit → return
 * 
 * Usage:
 * import { corsHeaders, handleCors } from './cors.ts'
 * import { requireAuth, requireAdmin, HTTPError } from './auth.ts'
 * import { validateInput } from './validate.ts'
 * import { logAudit } from './audit.ts'
 * 
 * export async function handler(req: Request): Promise<Response> {
 *   try {
 *     // Handle CORS preflight
 *     if (req.method === 'OPTIONS') {
 *       return handleCors()
 *     }
 * 
 *     // Require authentication (use requireAdmin for admin-only endpoints)
 *     const { user, profile, supabase } = await requireAuth(req)
 * 
 *     // Validate input
 *     const validatedData = await validateInput(req, yourSchema)
 * 
 *     // Business logic here
 *     const result = await yourBusinessLogic(validatedData, supabase, profile)
 * 
 *     // Log audit event
 *     await logAudit(supabase, {
 *       user_id: user.id,
 *       action: 'your_action',
 *       resource: 'your_resource',
 *       details: validatedData
 *     })
 * 
 *     // Return success response
 *     return new Response(
 *       JSON.stringify({ success: true, data: result }),
 *       { 
 *         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 *         status: 200
 *       }
 *     )
 *   } catch (error) {
 *     // Handle errors - never leak stack traces
 *     return handleError(error)
 *   }
 * }
 * 
 * function handleError(error: unknown): Response {
 *   if (error instanceof HTTPError) {
 *     return new Response(
 *       JSON.stringify({ 
 *         success: false, 
 *         error: error.message,
 *         code: error.code 
 *       }),
 *       { 
 *         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 *         status: error.status
 *       }
 *     )
 *   }
 * 
 *   // Log unexpected errors for debugging (but don't expose to client)
 *   console.error('Unexpected error:', error)
 *   
 *   return new Response(
 *     JSON.stringify({ 
 *       success: false, 
 *       error: 'Internal server error',
 *       code: 'INTERNAL_ERROR'
 *     }),
 *     { 
 *       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 *       status: 500
 *     }
 *   )
 * }
 */

import { corsHeaders } from './cors.ts'
import { HTTPError } from './auth.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/**
 * Standard error handler for Edge Functions
 */
export function handleError(error: unknown): Response {
  // Log unexpected errors to audit_log for security monitoring
  if (!(error instanceof HTTPError)) {
    logSystemError(error)
  }

  if (error instanceof HTTPError) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        code: error.code 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.status
      }
    )
  }

  // Return generic error message - never expose stack traces
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    }
  )
}

/**
 * Log system errors to audit_log for security monitoring
 */
async function logSystemError(error: unknown): Promise<void> {
  try {
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }

    await supabase
      .from('audit_log')
      .insert({
        action: 'system_error',
        resource: 'edge_function',
        details: errorDetails,
        created_at: new Date().toISOString()
      })
  } catch (logError) {
    // If we can't log the error, at least log to console
    console.error('Failed to log system error:', logError)
    console.error('Original error:', error)
  }
}

/**
 * Standard success response
 */
export function successResponse(data: any, status = 200): Response {
  return new Response(
    JSON.stringify({ success: true, data }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    }
  )
}

/**
 * Standard error response
 */
export function errorResponse(message: string, status = 400, code?: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: message, code }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    }
  )
}
