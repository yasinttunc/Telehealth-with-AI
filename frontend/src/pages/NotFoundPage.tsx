/* 404 — lightweight not-found page (spec §4). */

import { Link } from 'react-router-dom'
import { useAuth, homePathForRole } from '../auth/useAuth'

export function NotFoundPage() {
  const { user } = useAuth()
  const home = user ? homePathForRole(user.role) : '/login'
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-3xl font-semibold text-slate-800">404</p>
      <p className="mb-4 text-sm text-slate-500">This page could not be found.</p>
      <Link to={home} className="text-sm font-medium text-accent-700 hover:underline">
        Go back
      </Link>
    </div>
  )
}
