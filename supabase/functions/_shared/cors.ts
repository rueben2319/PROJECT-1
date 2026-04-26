/**
 * CORS configuration for MSCE Learn Edge Functions
 */

const PRODUCTION_DOMAIN = Deno.env.get('APP_URL') || 'https://msce-learn.com'
const LOCALHOST_DEV = 'http://localhost:5173'

/**
 * CORS headers for production (restricted to domain)
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': PRODUCTION_DOMAIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

/**
 * CORS headers for development (allows localhost)
 */
export const devCorsHeaders = {
  'Access-Control-Allow-Origin': LOCALHOST_DEV,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

/**
 * Get appropriate CORS headers based on environment
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  const isProduction = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined
  
  if (isProduction) {
    // In production, only allow the production domain
    return corsHeaders
  } else {
    // In development, allow localhost
    return devCorsHeaders
  }
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const headers = getCorsHeaders(req.headers.get('origin') || undefined)
    return new Response('ok', { headers })
  }
  return null
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(response: Response, origin?: string): Response {
  const headers = getCorsHeaders(origin)
  
  headers.forEach((value, key) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * Create a new response with CORS headers
 */
export function createCorsResponse(
  body: any,
  status: number = 200,
  origin?: string
): Response {
  const headers = getCorsHeaders(origin)
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  })
}

/**
 * Create an error response with CORS headers
 */
export function createCorsErrorResponse(
  message: string,
  status: number = 400,
  code?: string,
  origin?: string
): Response {
  const body = {
    error: true,
    message,
    ...(code && { code })
  }
  
  return createCorsResponse(body, status, origin)
}

/**
 * Validate origin for additional security
 */
export function validateOrigin(origin: string | null): boolean {
  if (!origin) return false
  
  const isProduction = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined
  
  if (isProduction) {
    // In production, only allow the production domain
    return origin === PRODUCTION_DOMAIN
  } else {
    // In development, allow localhost and any origin for testing
    return origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')
  }
}

/**
 * Enhanced CORS middleware with origin validation
 */
export function corsMiddleware(req: Request): Response | null {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin')
    
    if (!validateOrigin(origin)) {
      return new Response('Unauthorized origin', { status: 403 })
    }
    
    const headers = getCorsHeaders(origin || undefined)
    return new Response('ok', { headers })
  }
  
  // Validate origin for other requests
  const origin = req.headers.get('origin')
  if (origin && !validateOrigin(origin)) {
    return new Response('Unauthorized origin', { status: 403 })
  }
  
  return null
}
