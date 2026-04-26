import { createClient } from 'jsr:@supabase/supabase-js@2'

export interface User {
  id: string
  email: string
  role: string
  user_metadata: Record<string, any>
}

export interface Profile {
  id: string
  full_name: string
  phone: string
  email: string
  role: 'student' | 'admin'
  created_at: string
  updated_at: string
}

export interface AuthContext {
  user: User
  profile: Profile
  supabase: any
}

/**
 * Custom HTTP Error class
 */
export class HTTPError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'HTTPError'
  }
}

/**
 * Create Supabase client for Edge Functions
 */
function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Extract and verify JWT token from Authorization header
 */
async function extractToken(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new HTTPError(401, 'Missing Authorization header', 'MISSING_AUTH')
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/)
  if (!match) {
    throw new HTTPError(401, 'Invalid Authorization header format', 'INVALID_AUTH_FORMAT')
  }

  return match[1]
}

/**
 * Verify JWT token and return user
 */
async function verifyToken(token: string): Promise<User> {
  const supabase = createSupabaseClient()
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new HTTPError(401, 'Invalid or expired token', 'INVALID_TOKEN')
  }

  return {
    id: user.id,
    email: user.email!,
    role: user.user_metadata?.role || 'student',
    user_metadata: user.user_metadata || {}
  }
}

/**
 * Fetch user profile from database
 */
async function fetchProfile(supabase: any, userId: string): Promise<Profile> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    throw new HTTPError(404, 'Profile not found', 'PROFILE_NOT_FOUND')
  }

  return profile as Profile
}

/**
 * Require authentication middleware
 */
export async function requireAuth(req: Request): Promise<AuthContext> {
  try {
    const token = await extractToken(req)
    const user = await verifyToken(token)
    const supabase = createSupabaseClient()
    const profile = await fetchProfile(supabase, user.id)

    return {
      user,
      profile,
      supabase
    }
  } catch (error) {
    if (error instanceof HTTPError) {
      throw error
    }
    throw new HTTPError(500, 'Authentication failed', 'AUTH_ERROR')
  }
}

/**
 * Require admin role middleware
 */
export async function requireAdmin(req: Request): Promise<AuthContext> {
  const authContext = await requireAuth(req)
  
  if (authContext.profile.role !== 'admin') {
    throw new HTTPError(403, 'Admin access required', 'INSUFFICIENT_PERMISSIONS')
  }

  return authContext
}

/**
 * Optional authentication - returns context if authenticated, null otherwise
 */
export async function optionalAuth(req: Request): Promise<AuthContext | null> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return null
    }

    return await requireAuth(req)
  } catch {
    return null
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(profile: Profile, role: string): boolean {
  return profile.role === role
}

/**
 * Check if user is admin
 */
export function isAdmin(profile: Profile): boolean {
  return hasRole(profile, 'admin')
}

/**
 * Check if user is student
 */
export function isStudent(profile: Profile): boolean {
  return hasRole(profile, 'student')
}

/**
 * Get user IP address from request
 */
export function getUserIP(req: Request): string {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         'unknown'
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'unknown'
}
