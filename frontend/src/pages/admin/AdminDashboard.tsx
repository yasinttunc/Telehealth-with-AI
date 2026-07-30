/*
 * Admin dashboard (spec §5.2): four small count blocks, then a short open-alert
 * list and recent consultations. No decorative statistics or hero banners.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { PageHeader, Panel, StatCard, LoadingRow } from '../../components/ui'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDateTime } from '../../lib/format'
import { clinicName, patientName } from '../../lib/lookups'
import type { Alert, Clinic, Consultation, Patient } from '../../types/domain'

export function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ users: 0, doctors: 0, patients: 0, consultations: 0 })
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])

  useEffect(() => {
    let active = true
    Promise.all([
      api.users.list(),
      api.doctors.list(),
      api.patients.list(),
      api.consultations.list(),
      api.alerts.list(),
      api.clinics.list(),
    ]).then(([users, doctors, pts, cons, alrts, clns]) => {
      if (!active) return
      setCounts({ users: users.length, doctors: doctors.length, patients: pts.length, consultations: cons.length })
      setPatients(pts)
      setClinics(clns)
      setConsultations(cons)
      setAlerts(alrts)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  if (loading) return <LoadingRow />

  const openAlerts = alerts.filter((a) => a.status === 'OPEN' || a.status === 'ACKNOWLEDGED').slice(0, 4)
  const recent = [...consultations]
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
    .slice(0, 5)

  return (
    <div>
      <PageHeader title="Admin dashboard" description="System overview" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Users" value={counts.users} />
        <StatCard label="Doctors" value={counts.doctors} />
        <StatCard label="Patients" value={counts.patients} />
        <StatCard label="Consultations" value={counts.consultations} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Open alerts">
          {openAlerts.length === 0 ? (
            <p className="text-sm text-slate-500">No open alerts.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openAlerts.map((a) => (
                <li key={a.alertId} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">
                    {a.symptomName} · {clinicName(clinics, a.clinicId)}
                  </span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/alerts" className="mt-3 inline-block text-sm text-accent-700 hover:underline">
            View all alerts →
          </Link>
        </Panel>

        <Panel title="Recent consultations">
          <ul className="divide-y divide-slate-100">
            {recent.map((c) => (
              <li key={c.consultationId} className="flex items-center justify-between py-2 text-sm">
                <Link to={`/admin/consultations/${c.consultationId}`} className="text-slate-700 hover:text-accent-700">
                  {patientName(patients, c.patientId)}
                  <span className="text-slate-400"> · {formatDateTime(c.scheduledAt)}</span>
                </Link>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
          <Link to="/admin/consultations" className="mt-3 inline-block text-sm text-accent-700 hover:underline">
            View all consultations →
          </Link>
        </Panel>
      </div>
    </div>
  )
}
