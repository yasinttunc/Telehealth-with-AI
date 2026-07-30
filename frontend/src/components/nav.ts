/*
 * Sidebar navigation config, keyed by role (spec §4).
 * One list per role so the shell can render role-appropriate navigation and
 * the topbar can resolve a page title from the active path.
 */

import {
  LayoutDashboard,
  Users,
  Stethoscope,
  UserRound,
  Building2,
  CalendarClock,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../types/domain'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Exact match only (used for the dashboard index routes). */
  end?: boolean
}

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/admin/patients', label: 'Patients', icon: UserRound },
    { to: '/admin/clinics', label: 'Clinics', icon: Building2 },
    { to: '/admin/consultations', label: 'Consultations', icon: CalendarClock },
    { to: '/admin/alerts', label: 'Alerts', icon: TriangleAlert },
  ],
  DOCTOR: [
    { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/doctor/patients', label: 'Patients', icon: UserRound },
    { to: '/doctor/consultations', label: 'My consultations', icon: CalendarClock },
    { to: '/doctor/alerts', label: 'Alerts', icon: TriangleAlert },
    { to: '/doctors', label: 'Doctor directory', icon: Stethoscope },
  ],
  PATIENT: [
    { to: '/patient', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/patient/consultations', label: 'My consultations', icon: CalendarClock },
    { to: '/patient/doctors', label: 'Doctor directory', icon: Stethoscope },
  ],
}

export function navForRole(role: Role): NavItem[] {
  return NAV[role] ?? []
}

/** Best-effort page title from the active path for the topbar. */
export function titleForPath(role: Role, pathname: string): string {
  const items = navForRole(role)
  // Prefer the most specific (longest) matching nav path.
  const match = items
    .filter((i) => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(i.to + '/')))
    .sort((a, b) => b.to.length - a.to.length)[0]
  if (match) return match.label
  if (pathname.startsWith('/profile')) return 'Profile'
  return 'Telehealth With AI'
}
