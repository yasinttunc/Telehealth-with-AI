/*
 * EmptyState — shown when a list has no rows (spec §5.5: empty state with one
 * clear action).
 */

import type { ReactNode } from 'react'

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="mb-1 text-sm font-medium text-slate-700">{title}</p>
      <p className="mb-4 text-sm text-slate-500">{message}</p>
      {action}
    </div>
  )
}
