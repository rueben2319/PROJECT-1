import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

export default function AdminRoute({ children }) {
  const { isAdmin, loading } = useProfile()
  const location = useLocation()

  // Show loading spinner while auth state is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50">
        <div className="text-center">
          <div className="loading-spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // If authenticated and admin, render children
  return <ProtectedRoute>{children}</ProtectedRoute>
}
