import { useContext } from 'react'
import { AuthContext } from './AuthContext'

/** Access the current demo auth state. Must be used inside <AuthProvider>. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/** The landing route for a role after login (spec §4). */
export function homePathForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'DOCTOR':
      return '/doctor'
    case 'PATIENT':
      return '/patient'
    default:
      return '/login'
  }
}
