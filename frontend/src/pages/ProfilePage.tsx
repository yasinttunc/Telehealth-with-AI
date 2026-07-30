/*
 * ProfilePage — lightweight read-only view of the signed-in demo user.
 * Editing self-service fields is future backend work (/api/auth/me).
 */

import { useAuth } from '../auth/useAuth'
import { PageHeader, Panel } from '../components/ui'

export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: user.displayName },
    { label: 'Username', value: user.username },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role },
  ]

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" description="Your demo account details" />
      <Panel>
        <dl className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between py-2.5 text-sm">
              <dt className="text-slate-500">{r.label}</dt>
              <dd className="font-medium text-slate-800">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-slate-400">
          Editing profile details will be enabled once backend self-service endpoints exist.
        </p>
      </Panel>
    </div>
  )
}
