import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, requireAdmin, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Validation schema
const publishCourseSchema = z.object({
  course_id: z.string().uuid(),
  publish: z.boolean()
})

/**
 * Admin publish/unpublish course handler
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
    const validatedData = await validateInput(body, publishCourseSchema) as z.infer<typeof publishCourseSchema>

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, subject, grade, price_mwk, is_published')
      .eq('id', validatedData.course_id)
      .single()

    if (courseError || !course) {
      throw new HTTPError(404, 'Course not found', 'COURSE_NOT_FOUND')
    }

    // Update course publish status
    const { data: updatedCourse, error: updateError } = await supabase
      .from('courses')
      .update({
        is_published: validatedData.publish,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.course_id)
      .select()
      .single()

    if (updateError || !updatedCourse) {
      throw new HTTPError(500, 'Failed to update course status', 'COURSE_UPDATE_ERROR')
    }

    // Log audit event
    await logAudit({
      user_id: user.id,
      action: validatedData.publish ? AUDIT_EVENTS.COURSE_PUBLISHED : AUDIT_EVENTS.COURSE_UNPUBLISHED,
      resource: 'course',
      resource_id: validatedData.course_id,
      details: {
        title: course.title,
        subject: course.subject,
        grade: course.grade,
        price_mwk: course.price_mwk,
        previous_status: course.is_published,
        new_status: validatedData.publish
      }
    })

    return successResponse({
      success: true,
      course: updatedCourse,
      message: `Course ${validatedData.publish ? 'published' : 'unpublished'} successfully`
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
