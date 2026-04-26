import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Validation schema for query parameters
const coursesQuerySchema = z.object({
  subject: z.string().optional(),
  grade: z.enum(['MSCE', 'JCE', 'Both']).optional().default('Both'),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('50')
})

/**
 * Get courses with enrollment status for authenticated user
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
      subject: url.searchParams.get('subject') || undefined,
      grade: url.searchParams.get('grade') || 'Both',
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '50'
    }
    
    const validatedParams = await validateInput(queryParams, coursesQuerySchema) as z.infer<typeof coursesQuerySchema>

    // Build the query
    let query = supabase
      .from('courses')
      .select(`
        *,
        enrollments!left (
          id,
          user_id,
          expires_at,
          status,
          created_at
        )
      `)
      .eq('published', true)

    // Apply filters
    if (validatedParams.subject && validatedParams.subject !== 'All') {
      query = query.eq('subject', validatedParams.subject)
    }

    if (validatedParams.grade !== 'Both') {
      query = query.eq('grade', validatedParams.grade)
    }

    // Apply pagination
    const offset = (validatedParams.page - 1) * validatedParams.limit
    query = query.range(offset, offset + validatedParams.limit - 1)

    // Order by subject and title
    query = query.order('subject', { ascending: true }).order('title', { ascending: true })

    const { data: courses, error } = await query

    if (error) {
      throw new HTTPError(500, 'Failed to fetch courses', 'DATABASE_ERROR')
    }

    // Process courses to add enrollment status and days remaining
    const processedCourses = courses?.map(course => {
      const enrollment = course.enrollments?.find(e => e.user_id === user.id)
      
      let is_enrolled = false
      let expires_at = null
      let days_remaining = 0

      if (enrollment && enrollment.status === 'active') {
        is_enrolled = true
        expires_at = enrollment.expires_at
        
        // Calculate days remaining
        const expiryDate = new Date(expires_at)
        const now = new Date()
        const diffTime = expiryDate.getTime() - now.getTime()
        days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      // Remove enrollments array from response
      const { enrollments: _, ...courseData } = course

      return {
        ...courseData,
        is_enrolled,
        expires_at,
        days_remaining: Math.max(0, days_remaining)
      }
    }) || []

    // Log audit event
    await logAudit({
      user_id: user.id,
      action: AUDIT_EVENTS.COURSE_VIEWED,
      resource: 'course_catalog',
      details: {
        filters: {
          subject: validatedParams.subject,
          grade: validatedParams.grade
        },
        results_count: processedCourses.length,
        page: validatedParams.page
      }
    })

    return successResponse({
      courses: processedCourses,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: processedCourses.length
      }
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
