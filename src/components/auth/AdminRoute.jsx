import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import Card from '../ui/Card.jsx'
import Skeleton from '../ui/Skeleton.jsx'

export default function AdminRoute({ children }) {
  const { isAdmin, loading } = useProfile()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted p-4">
        <Card className="w-full max-w-sm space-y-3 text-center" role="status" aria-live="polite" aria-label="Loading admin access">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto h-4 w-32" />
          <Skeleton className="mx-auto h-4 w-56" />
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <ProtectedRoute>{children}</ProtectedRoute>
}
