import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, requireAdmin, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Validation schema
const createCourseSchema = z.object({
  title: z.string().min(1).max(255),
  subject: z.string().min(1).max(50),
  grade: z.enum(['MSCE', 'JCE']),
  price_mwk: z.number().positive(),
  description: z.string().min(1).max(2000)
})

/**
 * Admin create course handler
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
    const validatedData = await validateInput(body, createCourseSchema) as z.infer<typeof createCourseSchema>

    // Check if course with same title already exists
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('title', validatedData.title)
      .single()

    if (existingCourse) {
      throw new HTTPError(400, 'Course with this title already exists', 'COURSE_EXISTS')
    }

    // Create course (always as draft first)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: validatedData.title,
        subject: validatedData.subject,
        grade: validatedData.grade,
        price_mwk: validatedData.price_mwk,
        description: validatedData.description,
        is_published: false, // Always start as draft
        lesson_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (courseError || !course) {
      throw new HTTPError(500, 'Failed to create course', 'COURSE_CREATE_ERROR')
    }

    // Log audit event
    await logAudit({
      user_id: user.id,
      action: AUDIT_EVENTS.COURSE_CREATED,
      resource: 'course',
      resource_id: course.id,
      details: {
        title: validatedData.title,
        subject: validatedData.subject,
        grade: validatedData.grade,
        price_mwk: validatedData.price_mwk,
        is_published: false
      }
    })

    return successResponse({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        subject: course.subject,
        grade: course.grade,
        price_mwk: course.price_mwk,
        is_published: course.is_published,
        created_at: course.created_at
      },
      message: 'Course created successfully (draft status)'
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
