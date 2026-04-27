import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import Card from '../ui/Card.jsx'
import Skeleton from '../ui/Skeleton.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted p-4">
        <Card className="w-full max-w-sm space-y-3 text-center" role="status" aria-live="polite" aria-label="Loading account access">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto h-4 w-32" />
          <Skeleton className="mx-auto h-4 w-48" />
        </Card>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
