import { supabase } from './supabase.jsx'

export const ERROR_TYPES = {
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  GENERIC_FAILURE: 'GENERIC_FAILURE'
}

export const USER_SAFE_MESSAGES = {
  [ERROR_TYPES.NETWORK_UNAVAILABLE]: 'Network unavailable. Please check your connection and try again.',
  [ERROR_TYPES.UNAUTHORIZED]: 'Your session has expired. Please sign in and try again.',
  [ERROR_TYPES.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ERROR_TYPES.VALIDATION_ERROR]: 'Some information is invalid. Please review and try again.',
  [ERROR_TYPES.GENERIC_FAILURE]: 'Something went wrong. Please try again.'
}

function getErrorTypeFromStatus(status) {
  if (status === 401) return ERROR_TYPES.UNAUTHORIZED
  if (status === 403) return ERROR_TYPES.FORBIDDEN
  if (status === 400 || status === 422) return ERROR_TYPES.VALIDATION_ERROR
  return ERROR_TYPES.GENERIC_FAILURE
}

function isNetworkError(error) {
  return (
    error?.name === 'TypeError' ||
    error?.name === 'AbortError' ||
    /network|failed to fetch|load failed|offline/i.test(error?.message || '')
  )
}

export function createNormalizedError({ type = ERROR_TYPES.GENERIC_FAILURE, status = null, details = null, message = null }) {
  return {
    type,
    status,
    message: message || USER_SAFE_MESSAGES[type] || USER_SAFE_MESSAGES[ERROR_TYPES.GENERIC_FAILURE],
    details
  }
}

export function normalizeApiError(error, fallbackType = ERROR_TYPES.GENERIC_FAILURE) {
  if (error instanceof ApiError && error.normalized) {
    return error.normalized
  }

  if (isNetworkError(error)) {
    return createNormalizedError({ type: ERROR_TYPES.NETWORK_UNAVAILABLE })
  }

  return createNormalizedError({ type: fallbackType })
}

export function normalizeAuthError(error) {
  const message = (error?.message || '').toLowerCase()

  if (isNetworkError(error)) {
    return createNormalizedError({ type: ERROR_TYPES.NETWORK_UNAVAILABLE })
  }

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return createNormalizedError({ type: ERROR_TYPES.UNAUTHORIZED })
  }

  if (message.includes('not confirmed') || message.includes('verify')) {
    return {
      ...createNormalizedError({ type: ERROR_TYPES.VALIDATION_ERROR }),
      message: 'Please verify your account before continuing.'
    }
  }

  if (message.includes('already registered')) {
    return {
      ...createNormalizedError({ type: ERROR_TYPES.VALIDATION_ERROR }),
      message: 'An account with these details already exists.'
    }
  }

  if (message.includes('user not found')) {
    return {
      ...createNormalizedError({ type: ERROR_TYPES.VALIDATION_ERROR }),
      message: 'No account was found with those details.'
    }
  }

  return createNormalizedError({ type: ERROR_TYPES.GENERIC_FAILURE })
}

/**
 * Typed fetch wrapper for API calls with JWT authentication
 */
class ApiClient {
  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL
  }

  /**
   * Get current JWT token from Supabase session
   */
  async getAuthToken() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      throw new ApiError(createNormalizedError({ type: ERROR_TYPES.UNAUTHORIZED, status: 401 }))
    }
    return session?.access_token
  }

  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint (relative to Supabase URL)
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<Response>}
   */
  async request(endpoint, options = {}) {
    const token = await this.getAuthToken()
    const url = `${this.baseUrl}/functions/v1${endpoint}`

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const config = {
      ...options,
      headers,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const type = getErrorTypeFromStatus(response.status)
        throw new ApiError(createNormalizedError({
          type,
          status: response.status,
          details: errorData?.message || errorData?.error || null
        }))
      }

      return response
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(normalizeApiError(error))
    }
  }

  async publicRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}/functions/v1${endpoint}`

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    try {
      const token = await this.getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch {
      // No auth available, continue without it
    }

    const config = {
      ...options,
      headers,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const type = getErrorTypeFromStatus(response.status)
        throw new ApiError(createNormalizedError({
          type,
          status: response.status,
          details: errorData?.message || errorData?.error || null
        }))
      }

      return response
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(normalizeApiError(error))
    }
  }

  async get(endpoint, options = {}) {
    const response = await this.request(endpoint, { ...options, method: 'GET' })
    return response.json()
  }

  async publicGet(endpoint, options = {}) {
    const response = await this.publicRequest(endpoint, { ...options, method: 'GET' })
    return response.json()
  }

  async post(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.json()
  }

  async put(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json()
  }

  async delete(endpoint, options = {}) {
    const response = await this.request(endpoint, { ...options, method: 'DELETE' })
    return response.json()
  }

  async upload(endpoint, formData, options = {}) {
    const token = await this.getAuthToken()
    const url = `${this.baseUrl}/functions/v1${endpoint}`

    const headers = {
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const config = {
      ...options,
      method: 'POST',
      headers,
      body: formData,
    }

    try {
      const response = await fetch(url, config)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const type = getErrorTypeFromStatus(response.status)
        throw new ApiError(createNormalizedError({
          type,
          status: response.status,
          details: errorData?.message || errorData?.error || null
        }))
      }
      return response.json()
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(normalizeApiError(error))
    }
  }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(normalized) {
    super(normalized.message)
    this.name = 'ApiError'
    this.status = normalized.status
    this.type = normalized.type
    this.normalized = normalized
  }
}

export const api = new ApiClient()
export { ApiError }
