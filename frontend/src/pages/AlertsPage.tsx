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
import { PageHeader, LoadingRow, ErrorRow } from '../components/ui'
import { SuccessMessage } from '../components/SuccessMessage'
import { formatDateTime } from '../lib/format'
import { clinicName } from '../lib/lookups'
import type { Alert, AlertStatus, Clinic } from '../types/domain'

function nextStatuses(status: AlertStatus): AlertStatus[] {
  switch (status) {
    case 'OPEN':
      return ['ACKNOWLEDGED', 'DISMISSED']
    case 'ACKNOWLEDGED':
      return ['RESOLVED', 'DISMISSED']
    case 'RESOLVED':
    case 'DISMISSED':
      return []
  }
}

function actionLabel(status: AlertStatus) {
  return status === 'ACKNOWLEDGED' ? 'Acknowledge' : status === 'DISMISSED' ? 'Dismiss' : 'Resolve'
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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
    setError(null)
    try {
      const updated = await api.alerts.updateStatus(alert.alertId, { status })
      setAlerts((prev) => prev.map((a) => (a.alertId === updated.alertId ? updated : a)))
      setSuccess(`Alert status updated to ${status.toLowerCase()}.`)
    } catch {
      await load()
      setError('Could not update alert status. Refresh the list and try again.')
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
      header: 'Actions',
      cell: (a) => {
        const actions = nextStatuses(a.status)
        if (actions.length === 0) return <span className="text-sm text-slate-400">Final state</span>

        return (
          <div className="flex flex-wrap gap-2">
            {actions.map((status) => (
              <button
                key={status}
                type="button"
                disabled={updatingId === a.alertId}
                onClick={() => void changeStatus(a, status)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-accent-500 disabled:opacity-60"
              >
                {actionLabel(status)}
              </button>
            ))}
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader title="Alerts" description="Symptom surveillance signals for review" />
      {success && <SuccessMessage message={success} />}
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
