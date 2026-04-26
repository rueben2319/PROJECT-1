import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.jsx'

export function useEnrollment(courseId) {
  const [enrollment, setEnrollment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEnrollment()
  }, [courseId])

  const fetchEnrollment = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setEnrollment(null)
        return
      }

      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setEnrollment(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const invalidate = () => {
    fetchEnrollment()
  }

  return {
    enrollment,
    loading,
    error,
    invalidate,
    refetch: fetchEnrollment
  }
}

export function useEnrollments() {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEnrollments()
  }, [])

  const fetchEnrollments = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setEnrollments([])
        return
      }

      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (
            id,
            title,
            subject,
            grade,
            price_mwk
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (error) throw error

      setEnrollments(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const invalidate = () => {
    fetchEnrollments()
  }

  // Listen for payment success events
  useEffect(() => {
    const handlePaymentSuccess = (event) => {
      if (event.detail?.type === 'payment_success') {
        invalidate()
      }
    }

    window.addEventListener('payment_success', handlePaymentSuccess)
    return () => window.removeEventListener('payment_success', handlePaymentSuccess)
  }, [])

  return {
    enrollments,
    loading,
    error,
    invalidate,
    refetch: fetchEnrollments
  }
}
