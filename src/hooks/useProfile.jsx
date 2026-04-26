import React, { useContext } from 'react'
import { useAuth } from './useAuth.jsx'

const ProfileContext = React.createContext()

export function ProfileProvider({ children }) {
  const { profile, loading, refreshProfile } = useAuth()

  const value = {
    profile,
    loading,
    refreshProfile,
    isAdmin: profile?.role === 'admin',
    isStudent: profile?.role === 'student',
    role: profile?.role,
    fullName: profile?.full_name,
    phone: profile?.phone,
    email: profile?.email,
  }

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
