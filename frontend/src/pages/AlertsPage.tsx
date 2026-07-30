/*
 * AlertsPage (spec §5.8) — admin/doctor only. Simple table with symptom, clinic,
 * score, status, date, and a status dropdown. The route guard keeps PATIENT out;
 * this page is shared by ADMIN (/admin/alerts) and DOCTOR (/doctor/alerts).
 */

import { useEffect, useState } from 'react'
import { api } from '../api'
import { DataTable, type Column } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { selectClass } from '../components/formStyles'
import { PageHeader, LoadingRow, ErrorRow } from '../components/ui'
import { formatDateTime } from '../lib/format'
import { clinicName } from '../lib/lookups'
import type { Alert, AlertStatus, Clinic } from '../types/domain'

const STATUSES: AlertStatus[] = ['OPEN', 'ACKNOWLEDGED', 'DISMISSED', 'RESOLVED']

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [alrts, clns] = await Promise.all([api.alerts.list(), api.clinics.list()])
      setAlerts(alrts)
      setClinics(clns)
      setError(null)
    } catch {
      setError('Could not load alerts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function changeStatus(alert: Alert, status: AlertStatus) {
    setUpdatingId(alert.alertId)
    try {
      const updated = await api.alerts.updateStatus(alert.alertId, { status })
      setAlerts((prev) => prev.map((a) => (a.alertId === updated.alertId ? updated : a)))
    } catch {
      setError('Could not update alert status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const columns: Column<Alert>[] = [
    { header: 'Symptom', cell: (a) => <span className="font-medium text-slate-800">{a.symptomName}</span> },
    { header: 'Clinic', cell: (a) => <span className="text-slate-500">{clinicName(clinics, a.clinicId)}</span> },
    { header: 'Score', cell: (a) => <span className="tabular-nums">{a.score.toFixed(1)}</span> },
    { header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
    { header: 'Raised', cell: (a) => formatDateTime(a.createdAt) },
    {
      header: 'Set status',
      cell: (a) => (
        <select
          aria-label={`Update status for ${a.symptomName} alert`}
          className={`${selectClass} h-9 max-w-[11rem]`}
          value={a.status}
          disabled={updatingId === a.alertId}
          onChange={(e) => changeStatus(a, e.target.value as AlertStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Alerts" description="Symptom surveillance signals for review" />
      {error && <div className="mb-3"><ErrorRow message={error} /></div>}
      {loading ? (
        <LoadingRow />
      ) : alerts.length === 0 ? (
        <EmptyState title="No alerts" message="There are no alerts to review." />
      ) : (
        <DataTable columns={columns} rows={alerts} rowKey={(a) => a.alertId} />
      )}
    </div>
  )
}
