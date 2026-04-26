import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Validation schema for course ID
const courseParamsSchema = z.object({
  id: z.string().uuid()
})

/**
 * Get course detail with lesson list and completion status
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

    // Extract course ID from URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const courseId = pathParts[pathParts.length - 1]

    // Validate course ID
    const validatedParams = await validateInput(
      { id: courseId },
      courseParamsSchema
    ) as z.infer<typeof courseParamsSchema>

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', validatedParams.id)
      .single()

    if (courseError || !course) {
      throw new HTTPError(404, 'Course not found', 'COURSE_NOT_FOUND')
    }

    // Check if course is published
    if (!course.published) {
      throw new HTTPError(404, 'Course not available', 'COURSE_NOT_PUBLISHED')
    }

    // Fetch enrollment status
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, expires_at, status, created_at')
      .eq('user_id', user.id)
      .eq('course_id', validatedParams.id)
      .eq('status', 'active')
      .single()

    // Calculate enrollment status
    let is_enrolled = false
    let expires_at = null
    let days_remaining = 0

    if (enrollment) {
      is_enrolled = true
      expires_at = enrollment.expires_at
      
      // Calculate days remaining
      const expiryDate = new Date(expires_at)
      const now = new Date()
      const diffTime = expiryDate.getTime() - now.getTime()
      days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    // Fetch videos with progress data
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        *,
        progress!left (
          id,
          user_id,
          video_id,
          completed_at,
          watch_time_seconds
        )
      `)
      .eq('course_id', validatedParams.id)
      .eq('published', true)
      .order('lesson_order', { ascending: true })

    if (videosError) {
      throw new HTTPError(500, 'Failed to fetch lessons', 'DATABASE_ERROR')
    }

    // Process videos with completion status
    const processedVideos = videos?.map(video => {
      const progress = video.progress?.find(p => p.user_id === user.id)
      
      return {
        id: video.id,
        title: video.title,
        lesson_number: video.lesson_order,
        duration_seconds: video.duration_seconds,
        is_preview: video.is_preview || false,
        completed: !!progress?.completed_at,
        watch_time_seconds: progress?.watch_time_seconds || 0,
        completed_at: progress?.completed_at || null
      }
    }) || []

    // Calculate course statistics
    const total_duration_seconds = processedVideos.reduce((sum, video) => sum + video.duration_seconds, 0)
    const completed_count = processedVideos.filter(v => v.completed).length

    // Prepare course response
    const courseResponse = {
      ...course,
      is_enrolled,
      expires_at,
      days_remaining: Math.max(0, days_remaining),
      lesson_count: processedVideos.length,
      total_duration_seconds,
      completed_count
    }

    // Log audit event
    await logAudit({
      user_id: user.id,
      action: AUDIT_EVENTS.COURSE_VIEWED,
      resource: 'course_detail',
      resource_id: validatedParams.id,
      details: {
        course_title: course.title,
        is_enrolled,
        lesson_count: processedVideos.length
      }
    })

    return successResponse({
      course: courseResponse,
      videos: processedVideos
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
