/*
 * LoginPage — compact centered form, no hero artwork (spec §5.1).
 *
 * Uses the mock demo accounts. Invalid credentials show one generic message.
 * On success the user is redirected to their role dashboard.
 */

import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import { useAuth, homePathForRole } from '../auth/useAuth'

const DEMO_HINTS = [
  { label: 'Admin', username: 'admin', password: 'admin' },
  { label: 'Doctor', username: 'dr.sarah.patel', password: 'password' },
  { label: 'Patient', username: 'patient.oliver.hughes', password: 'password' },
]

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already logged in? Skip the form.
  if (user) return <Navigate to={homePathForRole(user.role)} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const authUser = await login(username, password)
      navigate(homePathForRole(authUser.role), { replace: true })
    } catch {
      // Single generic message regardless of which field is wrong (spec §5.1).
      setError('Invalid username or password.')
    } finally {
      setSubmitting(false)
    }
  }

  function fillDemo(u: string, p: string) {
    setUsername(u)
    setPassword(p)
    setError(null)
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-accent-700">
          <Stethoscope size={26} aria-hidden />
          <span className="text-xl font-semibold">Telehealth With AI</span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-slate-800">Sign in</h1>
          <p className="mb-5 text-sm text-slate-500">Use a demo account to continue.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
                Username or email
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-accent-500"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-accent-500"
                required
              />
            </div>

            {error && (
              <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-10 w-full rounded-md bg-accent-600 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Demo accounts
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_HINTS.map((h) => (
              <button
                key={h.username}
                type="button"
                onClick={() => fillDemo(h.username, h.password)}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-accent-500 hover:text-accent-700"
              >
                {h.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Mock login only — real JWT authentication is planned backend work.
          </p>
        </div>
      </div>
    </div>
  )
}
