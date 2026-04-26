import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'

// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Validation schema
const coursesQuerySchema = z.object({
  subject: z.string().optional(),
  grade: z.enum(['MSCE', 'JCE', 'Both']).optional().default('Both'),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('50')
})

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false } }
    )

    // Validate query parameters
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams)
    const validatedParams = coursesQuerySchema.parse(queryParams)

    // Build query for public courses (no enrollment data)
    let query = supabase
      .from('courses')
      .select(`
        *,
        videos (
          id,
          title,
          duration_seconds,
          is_preview,
          lesson_order
        )
      `)
      .eq('is_published', true)

    // Apply filters
    if (validatedParams.subject && validatedParams.subject !== 'All') {
      query = query.eq('subject', validatedParams.subject)
    }

    if (validatedParams.grade && validatedParams.grade !== 'Both') {
      query = query.eq('grade', validatedParams.grade)
    }

    // Get pagination info
    const page = Number(validatedParams.page) || 1
    const limit = Number(validatedParams.limit) || 50
    const offset = (page - 1) * limit

    // Get total count
    const { count, error: countError } = await query
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw new Error('Failed to count courses')
    }

    // Get paginated results
    const { data: courses, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error('Failed to fetch courses')
    }

    // Check if user is authenticated for enrollment status
    let coursesWithEnrollment = courses || []
    
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        
        if (user) {
          // User is authenticated, check enrollment status
          coursesWithEnrollment = await Promise.all(
            (courses || []).map(async (course) => {
              const { data: enrollment } = await supabase
                .from('enrollments')
                .select('id, expires_at')
                .eq('user_id', user.id)
                .eq('course_id', course.id)
                .gt('expires_at', new Date().toISOString())
                .single()

              return {
                ...course,
                is_enrolled: !!enrollment,
                expires_at: enrollment?.expires_at || null
              }
            })
          )
        }
      } catch (authError) {
        // Auth failed, continue without enrollment data
        console.log('Auth check failed, serving public data')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          courses: coursesWithEnrollment,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit)
          }
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
