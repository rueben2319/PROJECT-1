import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Validation schema
const saveProgressSchema = z.object({
  video_id: z.string().uuid(),
  seconds_watched: z.number().min(0).max(86400) // Max 24 hours
})

/**
 * Save video progress
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

    // Validate input
    const body = await req.json()
    const validatedData = await validateInput(body, saveProgressSchema) as z.infer<typeof saveProgressSchema>

    // Fetch video details to get duration
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('duration_seconds, course_id')
      .eq('id', validatedData.video_id)
      .single()

    if (videoError || !video) {
      throw new HTTPError(404, 'Video not found', 'VIDEO_NOT_FOUND')
    }

    // Calculate completion status (90% threshold)
    const completionThreshold = video.duration_seconds * 0.9
    const isCompleted = validatedData.seconds_watched >= completionThreshold

    // Upsert progress record
    const { data: progress, error: progressError } = await supabase
      .from('progress')
      .upsert({
        user_id: user.id,
        video_id: validatedData.video_id,
        course_id: video.course_id,
        watch_time_seconds: validatedData.seconds_watched,
        completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,video_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (progressError) {
      throw new HTTPError(500, 'Failed to save progress', 'PROGRESS_SAVE_ERROR')
    }

    // If lesson was just completed, log completion event
    if (isCompleted) {
      await logAudit({
        user_id: user.id,
        action: AUDIT_EVENTS.COURSE_COMPLETED,
        resource: 'lesson',
        resource_id: validatedData.video_id,
        details: {
          course_id: video.course_id,
          seconds_watched: validatedData.seconds_watched,
          duration_seconds: video.duration_seconds,
          completion_percentage: Math.round((validatedData.seconds_watched / video.duration_seconds) * 100)
        }
      })
    }

    return successResponse({
      success: true,
      progress: {
        video_id: validatedData.video_id,
        seconds_watched: validatedData.seconds_watched,
        completed: isCompleted,
        completion_percentage: Math.round((validatedData.seconds_watched / video.duration_seconds) * 100)
      }
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
