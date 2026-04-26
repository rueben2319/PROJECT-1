import { supabase } from './supabase.jsx'

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
      throw new Error(`Failed to get auth session: ${error.message}`)
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
        throw new ApiError(response.status, errorData.message || response.statusText)
      }
      
      return response
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new Error(`Network error: ${error.message}`)
    }
  }

  /**
   * Make public API request (no auth required)
   * @param {string} endpoint - API endpoint (relative to Supabase URL)
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<Response>}
   */
  async publicRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}/functions/v1${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Try to add auth token if available (for enrollment status)
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
        throw new ApiError(response.status, errorData.message || response.statusText)
      }
      
      return response
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new Error(`Network error: ${error.message}`)
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {RequestInit} options - Additional options
   * @returns {Promise<any>}
   */
  async get(endpoint, options = {}) {
    const response = await this.request(endpoint, { ...options, method: 'GET' })
    return response.json()
  }

  /**
   * Public GET request (no auth required)
   * @param {string} endpoint - API endpoint
   * @param {RequestInit} options - Additional options
   * @returns {Promise<any>}
   */
  async publicGet(endpoint, options = {}) {
    const response = await this.publicRequest(endpoint, { ...options, method: 'GET' })
    return response.json()
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @param {RequestInit} options - Additional options
   * @returns {Promise<any>}
   */
  async post(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.json()
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @param {RequestInit} options - Additional options
   * @returns {Promise<any>}
   */
  async put(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json()
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {RequestInit} options - Additional options
   * @returns {Promise<any>}
   */
  async delete(endpoint, options = {}) {
    const response = await this.request(endpoint, { ...options, method: 'DELETE' })
    return response.json()
  }

  /**
   * File upload request
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with files
   * @param {RequestInit} options - Additional options
   * @returns {Promise<any>}
   */
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

    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(response.status, errorData.message || response.statusText)
    }
    
    return response.json()
  }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const api = new ApiClient()
export { ApiError }
