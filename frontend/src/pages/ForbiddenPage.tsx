/* 403 — lightweight access-denied page (spec §4). */

import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth, homePathForRole } from '../auth/useAuth'

export function ForbiddenPage() {
  const { user } = useAuth()
  const home = user ? homePathForRole(user.role) : '/login'
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 text-center">
      <ShieldAlert size={40} className="mb-3 text-warn-600" aria-hidden />
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Access denied</h1>
      <p className="mb-4 text-sm text-slate-500">
        You don’t have permission to view this page.
      </p>
      <Link to={home} className="text-sm font-medium text-accent-700 hover:underline">
        Back to your dashboard
      </Link>
    </div>
  )
}
