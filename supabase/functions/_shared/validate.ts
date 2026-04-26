import { z } from 'npm:zod@3.22.4'
import { HTTPError } from './auth.ts'

/**
 * Generic validation function
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const fieldErrors = (error as z.ZodError).errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }))
      
      throw new HTTPError(
        400,
        'Validation failed',
        'VALIDATION_ERROR'
      )
    }
    throw new HTTPError(400, 'Invalid input data', 'INVALID_INPUT')
  }
}

/**
 * Common validation schemas
 */
export const schemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email address'),
  
  // Phone number validation (Malawi format)
  phoneNumber: z.string().regex(
    /^(?:\+265|0)?[9]\d{8}$/,
    'Invalid Malawi phone number format'
  ),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  
  // Date validation
  date: z.string().datetime('Invalid datetime format'),
  
  // Payment amount validation
  amount: z.number().int().positive('Amount must be positive integer').max(1000000, 'Amount too large'),
  
  // Grade level validation
  grade: z.enum(['MSCE', 'JCE'], 'Invalid grade level'),
  
  // Role validation
  role: z.enum(['student', 'admin'], 'Invalid user role'),
  
  // Subject validation
  subject: z.enum([
    'Mathematics', 'Biology', 'Chemistry', 'Physics', 'English', 
    'Geography', 'History', 'Agriculture', 'Computer Studies', 'Life Skills'
  ], 'Invalid subject'),
}

/**
 * Payment-related schemas
 */
export const paymentSchemas = {
  createPayment: z.object({
    courseId: schemas.uuid,
    phoneNumber: schemas.phoneNumber,
    paymentMethod: z.enum(['airtel', 'tnm']),
    amount: schemas.amount,
    email: schemas.email.optional(),
  }),
  
  paymentCallback: z.object({
    reference: z.string(),
    status: z.enum(['success', 'failed', 'pending']),
    amount: schemas.amount,
    transactionId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
}

/**
 * Course-related schemas
 */
export const courseSchemas = {
  createCourse: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    subject: z.string().min(1).max(100),
    price: schemas.amount,
    thumbnailUrl: z.string().url().optional(),
    isPublished: z.boolean().default(false),
  }),
  
  updateCourse: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    subject: z.string().min(1).max(100).optional(),
    price: schemas.amount.optional(),
    thumbnailUrl: z.string().url().optional(),
    isPublished: z.boolean().optional(),
  }),
  
  getCourse: z.object({
    id: schemas.uuid.optional(),
    subject: z.string().optional(),
    published: z.boolean().optional(),
  }).and(schemas.pagination),
}

/**
 * Video-related schemas
 */
export const videoSchemas = {
  getVideoUrl: z.object({
    courseId: schemas.uuid,
    videoId: schemas.uuid,
  }),
  
  uploadVideo: z.object({
    courseId: schemas.uuid,
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    duration: z.number().positive().optional(),
    order: z.number().int().min(0).optional(),
  }),
}

/**
 * User-related schemas
 */
export const userSchemas = {
  updateProfile: z.object({
    fullName: z.string().min(1).max(100).optional(),
    phoneNumber: schemas.phoneNumber.optional(),
    school: z.string().max(200).optional(),
    grade: z.string().max(50).optional(),
  }),
  
  adminCreateUser: z.object({
    email: schemas.email,
    fullName: z.string().min(1).max(100),
    role: z.enum(['user', 'admin']),
    phoneNumber: schemas.phoneNumber.optional(),
  }),
}

/**
 * Admin-related schemas
 */
export const adminSchemas = {
  getStats: z.object({
    startDate: schemas.date.optional(),
    endDate: schemas.date.optional(),
  }),
  
  paymentAction: z.object({
    paymentId: schemas.uuid,
    action: z.enum(['approve', 'reject', 'refund']),
    reason: z.string().max(500).optional(),
  }),
  
  exportAudit: z.object({
    startDate: schemas.date.optional(),
    endDate: schemas.date.optional(),
    userId: schemas.uuid.optional(),
    action: z.string().optional(),
    format: z.enum(['json', 'csv']).default('json'),
  }).and(schemas.pagination),
}

/**
 * Request validation middleware
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (req: Request): Promise<T> => {
    const body = await req.json().catch(() => {
      throw new HTTPError(400, 'Invalid JSON body', 'INVALID_JSON')
    })
    
    return validateInput(schema, body)
  }
}

/**
 * Query parameter validation middleware
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request): T => {
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams)
    
    return validateInput(schema, query)
  }
}

/**
 * File upload validation
 */
export function validateFileUpload(
  maxSize: number = 100 * 1024 * 1024, // 100MB default
  allowedTypes: string[] = ['video/mp4', 'video/webm']
) {
  return async (req: Request): Promise<File> => {
    const formData = await req.formData().catch(() => {
      throw new HTTPError(400, 'Invalid form data', 'INVALID_FORM')
    })
    
    const file = formData.get('file') as File
    
    if (!file) {
      throw new HTTPError(400, 'No file provided', 'MISSING_FILE')
    }
    
    if (file.size > maxSize) {
      throw new HTTPError(400, `File size exceeds ${maxSize / 1024 / 1024}MB limit`, 'FILE_TOO_LARGE')
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new HTTPError(400, `File type ${file.type} not allowed`, 'INVALID_FILE_TYPE')
    }
    
    return file
  }
}
