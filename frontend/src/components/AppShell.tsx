/*
 * AppShell — the one layout wrapper (spec §4): narrow sidebar, top bar with
 * page title + user menu, main content area. On small screens the sidebar
 * collapses into a drawer toggled from the top bar.
 */

import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut, Stethoscope } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { navForRole, titleForPath } from './nav'

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!user) return null // RequireRole handles redirects; this is defensive.

  const items = navForRole(user.role)
  const title = titleForPath(user.role, location.pathname)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4 text-accent-100">
        <Stethoscope size={20} aria-hidden />
        <span className="text-sm font-semibold">Telehealth With AI</span>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-2" aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                  isActive
                    ? 'bg-accent-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                ].join(' ')
              }
            >
              <Icon size={18} aria-hidden />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
        Signed in as <span className="text-slate-200">{user.role.toLowerCase()}</span>
      </div>
    </div>
  )

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 bg-slate-900 md:block">{sidebarInner}</aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-60 bg-slate-900">{sidebarInner}</aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <h1 className="flex-1 truncate text-lg font-semibold text-slate-800">{title}</h1>
          <div className="flex items-center gap-3">
            <NavLink
              to="/profile"
              className="hidden text-sm text-slate-600 hover:text-accent-700 sm:block"
            >
              {user.displayName}
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut size={16} aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
