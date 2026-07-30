/*
 * StatusBadge — status pill for consultations and alerts.
 * Never relies on colour alone: the status text is always shown (spec §6).
 */

import type { AlertStatus, ConsultationStatus } from '../types/domain'

const CONSULTATION_STYLES: Record<ConsultationStatus, string> = {
  SCHEDULED: 'bg-accent-50 text-accent-700 border-accent-100',
  IN_PROGRESS: 'bg-warn-100 text-warn-700 border-warn-100',
  COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-100',
}

const ALERT_STYLES: Record<AlertStatus, string> = {
  OPEN: 'bg-warn-100 text-warn-700 border-warn-100',
  ACKNOWLEDGED: 'bg-accent-50 text-accent-700 border-accent-100',
  DISMISSED: 'bg-slate-100 text-slate-600 border-slate-200',
  RESOLVED: 'bg-slate-100 text-slate-600 border-slate-200',
}

function label(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')
}

export function StatusBadge({ status }: { status: ConsultationStatus | AlertStatus }) {
  const style =
    (CONSULTATION_STYLES as Record<string, string>)[status] ??
    (ALERT_STYLES as Record<string, string>)[status] ??
    'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {label(status)}
    </span>
  )
}
