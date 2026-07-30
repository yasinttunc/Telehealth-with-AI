/*
 * AuthContext — holds the currently "logged in" demo user.
 *
 * IMPORTANT: this is temporary mock authentication until Spring JWT login is
 * implemented (spec §3). The user object is stored in sessionStorage so a page
 * refresh keeps you logged in during a demo. There is NO real browser security
 * here — the route guards are navigation UX only, and the backend remains the
 * real authority once wired up.
 */

import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api'
import type { AuthUser } from '../types/domain'

const STORAGE_KEY = 'telehealth.demoUser'

interface AuthContextValue {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)

  const login = useCallback(async (username: string, password: string) => {
    const authUser = await api.auth.login({ username, password })
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
    return authUser
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
