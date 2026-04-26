import { corsMiddleware } from '../_shared/cors.ts'
import { requireAuth, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT_EVENTS } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'
import { rateLimiters } from '../_shared/rateLimit.ts'
import { z } from 'jsr:@zod/zod@3.22.4'

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID')!
const R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!
const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!
const R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!

// Validation schema
const getVideoUrlSchema = z.object({
  video_id: z.string().uuid(),
  course_id: z.string().uuid()
})

/**
 * Generate signed URL for Cloudflare R2 video
 */
async function generateSignedUrl(bucketName: string, objectKey: string): Promise<string> {
  const expiresIn = 600 // 10 minutes
  const expiration = Math.floor(Date.now() / 1000) + expiresIn

  // Canonical request
  const canonicalRequest = [
    'GET',
    `/${bucketName}/${objectKey}`,
    '',
    'host=account.cloudflare.com',
    'x-amz-date=' + new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
    'host;x-amz-date',
    'UNSIGNED-PAYLOAD'
  ].join('\n')

  // String to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
    'auto/cloudfront',
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest)).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''))
  ].join('\n')

  // Calculate signature
  const awsSecret = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(R2_SECRET_ACCESS_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const dateKey = await crypto.subtle.sign(
    'HMAC',
    awsSecret,
    new TextEncoder().encode(new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''))
  )

  const regionKey = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', dateKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    new TextEncoder().encode('auto')
  )

  const serviceKey = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', regionKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    new TextEncoder().encode('cloudfront')
  )

  const signingKey = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', serviceKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    new TextEncoder().encode('aws4_request')
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    signingKey,
    new TextEncoder().encode(stringToSign)
  )

  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')

  // Build signed URL
  const signedUrl = `https://${bucketName}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${objectKey}?` +
    `X-Amz-Algorithm=AWS4-HMAC-SHA256&` +
    `X-Amz-Credential=${R2_ACCESS_KEY_ID}/${new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')}/auto/cloudfront&` +
    `X-Amz-Date=${new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')}&` +
    `X-Amz-Expires=${expiresIn}&` +
    `X-Amz-SignedHeaders=host;x-amz-date&` +
    `X-Amz-Signature=${signatureHex}`

  return signedUrl
}

/**
 * Get signed video URL
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
    await rateLimiters.videoUrl(req, user.id)

    // Validate input
    const body = await req.json()
    const validatedData = await validateInput(body, getVideoUrlSchema) as z.infer<typeof getVideoUrlSchema>

    // Fetch video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        r2_playlist_path,
        duration_seconds,
        is_preview,
        published,
        courses (
          id,
          title,
          price_mwk
        )
      `)
      .eq('id', validatedData.video_id)
      .eq('course_id', validatedData.course_id)
      .single()

    if (videoError || !video) {
      throw new HTTPError(404, 'Video not found', 'VIDEO_NOT_FOUND')
    }

    if (!video.published) {
      throw new HTTPError(404, 'Video not available', 'VIDEO_NOT_PUBLISHED')
    }

    // Check enrollment for non-preview videos
    if (!video.is_preview) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id, expires_at, status')
        .eq('user_id', user.id)
        .eq('course_id', validatedData.course_id)
        .eq('status', 'active')
        .single()

      if (!enrollment) {
        throw new HTTPError(403, 'Access denied', 'ACCESS_DENIED')
      }

      // Check if enrollment is still valid
      if (new Date(enrollment.expires_at) < new Date()) {
        throw new HTTPError(403, 'Access expired', 'ACCESS_EXPIRED')
      }
    }

    // Generate signed URL for the playlist
    if (!video.r2_playlist_path) {
      throw new HTTPError(500, 'Video file not found', 'VIDEO_FILE_NOT_FOUND')
    }

    const signedUrl = await generateSignedUrl(R2_BUCKET_NAME, video.r2_playlist_path)

    // Log audit event
    await logAudit({
      user_id: user.id,
      action: AUDIT_EVENTS.VIDEO_VIEWED,
      resource: 'video',
      resource_id: validatedData.video_id,
      details: {
        course_id: validatedData.course_id,
        video_title: video.title,
        is_preview: video.is_preview
      }
    })

    return successResponse({
      url: signedUrl,
      video_data: {
        id: video.id,
        title: video.title,
        duration_seconds: video.duration_seconds,
        is_preview: video.is_preview
      }
    })

  } catch (error) {
    return handleError(error)
  }
}

// Deno.serve(handler) // Commented out for IDE compatibility
