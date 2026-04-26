import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime?: number
}

/**
 * Check rate limit for a given key
 * @param key - Rate limit key (format: rate:{endpoint}:{userId or IP})
 * @param maxCount - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @param supabase - Supabase client instance
 * @returns Rate limit result
 */
export async function checkRateLimit(
  key: string,
  maxCount: number,
  windowMs: number,
  supabaseClient = supabase
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowMs
  const resetTime = now + windowMs

  try {
    // Clean up old entries first
    await supabaseClient
      .from('rate_limits')
      .delete()
      .lt('created_at', new Date(windowStart).toISOString())

    // Get current count for this key
    const { data: existing } = await supabaseClient
      .from('rate_limits')
      .select('count')
      .eq('key', key)
      .gte('created_at', new Date(windowStart).toISOString())
      .single()

    const currentCount = existing?.count || 0

    if (currentCount >= maxCount) {
      return {
        allowed: false,
        remaining: 0,
        resetTime
      }
    }

    // Increment or create rate limit record
    if (currentCount > 0) {
      await supabaseClient
        .from('rate_limits')
        .update({ 
          count: currentCount + 1,
          updated_at: new Date().toISOString()
        })
        .eq('key', key)
    } else {
      await supabaseClient
        .from('rate_limits')
        .insert({
          key,
          count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    return {
      allowed: true,
      remaining: maxCount - currentCount - 1,
      resetTime
    }

  } catch (error) {
    // If rate limiting fails, allow the request (fail-safe)
    console.error('Rate limiting error:', error)
    return {
      allowed: true,
      remaining: maxCount,
      resetTime
    }
  }
}

/**
 * Extract IP address from request
 */
export function extractIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const remoteAddr = req.headers.get('remote-addr')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  if (remoteAddr) {
    return remoteAddr
  }

  return 'unknown'
}

/**
 * Create rate limit key for user
 */
export function createUserRateLimitKey(endpoint: string, userId: string): string {
  return `rate:${endpoint}:${userId}`
}

/**
 * Create rate limit key for IP
 */
export function createIPRateLimitKey(endpoint: string, ip: string): string {
  return `rate:${endpoint}:${ip}`
}

/**
 * Rate limit middleware
 */
export function createRateLimitMiddleware(
  endpoint: string,
  maxCount: number,
  windowMs: number,
  useIP = false
) {
  return async (req: Request, userId?: string) => {
    const key = useIP 
      ? createIPRateLimitKey(endpoint, extractIP(req))
      : createUserRateLimitKey(endpoint, userId || extractIP(req))

    const result = await checkRateLimit(key, maxCount, windowMs)

    if (!result.allowed) {
      const headers = new Headers()
      headers.set('Retry-After', Math.ceil((result.resetTime! - Date.now()) / 1000).toString())
      
      throw new Error('Rate limit exceeded', {
        cause: { status: 429, headers }
      })
    }

    return result
  }
}

// Predefined rate limiters
export const rateLimiters = {
  paymentCreation: createRateLimitMiddleware('payment-create', 10, 5 * 60 * 1000), // 10 per 5 minutes
  videoUrl: createRateLimitMiddleware('video-url', 60, 60 * 1000), // 60 per minute
  login: createRateLimitMiddleware('login', 20, 60 * 1000), // 20 per minute
  registration: createRateLimitMiddleware('register', 5, 60 * 1000), // 5 per minute
  passwordReset: createRateLimitMiddleware('password-reset', 3, 60 * 1000), // 3 per minute
}
