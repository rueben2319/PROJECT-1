import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getUserIP, getUserAgent } from './auth.ts'

/**
 * Audit event types
 */
export enum AUDIT_EVENTS {
  // Authentication events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_REGISTER = 'user.register',
  USER_PROFILE_UPDATE = 'user.profile_update',
  
  // Payment events
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_APPROVED = 'payment.approved',
  PAYMENT_REJECTED = 'payment.rejected',
  
  // Course events
  COURSE_ACCESS_GRANTED = 'course.access_granted',
  COURSE_ACCESS_REVOKED = 'course.access_revoked',
  COURSE_VIEWED = 'course.viewed',
  COURSE_COMPLETED = 'course.completed',
  COURSE_CREATED = 'course.created',
  COURSE_UPDATED = 'course.updated',
  COURSE_DELETED = 'course.deleted',
  COURSE_PUBLISHED = 'course.published',
  COURSE_UNPUBLISHED = 'course.unpublished',
  
  // Video events
  VIDEO_VIEWED = 'video.viewed',
  VIDEO_UPLOADED = 'video.uploaded',
  VIDEO_UPDATED = 'video.updated',
  VIDEO_DELETED = 'video.deleted',
  
  // Admin events
  ADMIN_USER_CREATED = 'admin.user_created',
  ADMIN_USER_UPDATED = 'admin.user_updated',
  ADMIN_USER_DELETED = 'admin.user_deleted',
  ADMIN_STATS_VIEWED = 'admin.stats_viewed',
  ADMIN_AUDIT_EXPORTED = 'admin.audit_exported',
  ADMIN_PAYMENT_ACTION = 'admin.payment_action',
  
  // System events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_WEBHOOK_RECEIVED = 'system.webhook_received',
  SYSTEM_SECURITY_ALERT = 'system.security_alert',
}

/**
 * Audit log interface
 */
export interface AuditLog {
  id?: string
  user_id?: string
  event: AUDIT_EVENTS
  resource_type?: string
  resource_id?: string
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at?: string
}

/**
 * Create Supabase client for audit logging
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
 * Log audit event to database
 */
export async function logAudit(auditData: AuditLog): Promise<void> {
  try {
    const supabase = createSupabaseClient()
    
    const auditRecord = {
      ...auditData,
      created_at: new Date().toISOString(),
    }
    
    const { error } = await supabase
      .from('audit_logs')
      .insert(auditRecord)
    
    if (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw error to avoid breaking main functionality
    }
  } catch (error) {
    console.error('Audit logging error:', error)
    // Don't throw error to avoid breaking main functionality
  }
}

/**
 * Create audit log helper function
 */
export function createAuditLog(
  event: AUDIT_EVENTS,
  userId?: string,
  resourceType?: string,
  resourceId?: string,
  details: Record<string, any> = {}
): AuditLog {
  return {
    user_id: userId,
    event,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
  }
}

/**
 * Enhanced audit logging with request context
 */
export async function logAuditFromRequest(
  req: Request,
  event: AUDIT_EVENTS,
  userId?: string,
  resourceType?: string,
  resourceId?: string,
  details: Record<string, any> = {}
): Promise<void> {
  const auditLog = createAuditLog(event, userId, resourceType, resourceId, {
    ...details,
    method: req.method,
    url: req.url,
    ip_address: getUserIP(req),
    user_agent: getUserAgent(req),
  })
  
  await logAudit(auditLog)
}

/**
 * Specific audit logging helpers
 */
export const auditHelpers = {
  // User authentication
  logUserLogin: (userId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.USER_LOGIN, userId, 'user', userId, details)),
    
  logUserLogout: (userId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.USER_LOGOUT, userId, 'user', userId, details)),
    
  logUserRegister: (userId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.USER_REGISTER, userId, 'user', userId, details)),
    
  logProfileUpdate: (userId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.USER_PROFILE_UPDATE, userId, 'user', userId, details)),
  
  // Payment events
  logPaymentInitiated: (userId: string, paymentId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.PAYMENT_INITIATED, userId, 'payment', paymentId, details)),
    
  logPaymentSuccess: (userId: string, paymentId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.PAYMENT_SUCCESS, userId, 'payment', paymentId, details)),
    
  logPaymentFailed: (userId?: string, paymentId?: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.PAYMENT_FAILED, userId, 'payment', paymentId, details)),
    
  logPaymentRefunded: (userId: string, paymentId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.PAYMENT_REFUNDED, userId, 'payment', paymentId, details)),
  
  // Course events
  logCourseAccess: (userId: string, courseId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.COURSE_ACCESS_GRANTED, userId, 'course', courseId, details)),
    
  logCourseViewed: (userId: string, courseId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.COURSE_VIEWED, userId, 'course', courseId, details)),
    
  logCourseCreated: (userId: string, courseId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.COURSE_CREATED, userId, 'course', courseId, details)),
    
  logCourseUpdated: (userId: string, courseId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.COURSE_UPDATED, userId, 'course', courseId, details)),
    
  logCourseDeleted: (userId: string, courseId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.COURSE_DELETED, userId, 'course', courseId, details)),
  
  // Video events
  logVideoViewed: (userId: string, videoId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.VIDEO_VIEWED, userId, 'video', videoId, details)),
    
  logVideoUploaded: (userId: string, videoId: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.VIDEO_UPLOADED, userId, 'video', videoId, details)),
  
  // Admin events
  logAdminAction: (userId: string, action: string, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.ADMIN_STATS_VIEWED, userId, 'admin', undefined, { action, ...details })),
    
  logSecurityAlert: (details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.SYSTEM_SECURITY_ALERT, undefined, 'system', undefined, details)),
    
  logSystemError: (error: Error, details?: Record<string, any>) =>
    logAudit(createAuditLog(AUDIT_EVENTS.SYSTEM_ERROR, undefined, 'system', undefined, {
      error: error.message,
      stack: error.stack,
      ...details
    })),
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filters: {
  userId?: string
  event?: AUDIT_EVENTS
  resourceType?: string
  resourceId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
} = {}) {
  try {
    const supabase = createSupabaseClient()
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }
    
    if (filters.event) {
      query = query.eq('event', filters.event)
    }
    
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }
    
    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId)
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }
    
    // Apply pagination
    const page = filters.page || 1
    const limit = filters.limit || 50
    const offset = (page - 1) * limit
    
    query = query.range(offset, offset + limit - 1)
    
    const { data, error, count } = await query
    
    if (error) {
      throw error
    }
    
    return {
      logs: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  } catch (error) {
    console.error('Failed to get audit logs:', error)
    throw error
  }
}
