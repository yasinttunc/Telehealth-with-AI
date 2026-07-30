/*
 * Patient dashboard (spec §5.4): one upcoming consultation and a short history.
 * No patient lists, alerts, or admin actions. Only this patient's own data is
 * ever loaded (ownership enforced by passing the account's patientId).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth/useAuth'
import { PageHeader, Panel, LoadingRow } from '../../components/ui'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDateTime } from '../../lib/format'
import { clinicName, clinicianName } from '../../lib/lookups'
import type { Clinic, Consultation, Doctor } from '../../types/domain'

export function PatientDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])

  useEffect(() => {
    if (!user?.patientId) return
    let active = true
    Promise.all([
      api.consultations.list({ patientId: user.patientId }),
      api.doctors.list(),
      api.clinics.list(),
    ]).then(([cons, docs, clns]) => {
      if (!active) return
      setConsultations(cons)
      setDoctors(docs)
      setClinics(clns)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user])

  if (loading) return <LoadingRow />

  const now = Date.now()
  const upcoming = consultations
    .filter((c) => c.status === 'SCHEDULED' || c.status === 'IN_PROGRESS')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0]
  const history = consultations
    .filter((c) => c.status === 'COMPLETED' || c.status === 'CANCELLED' || new Date(c.scheduledAt).getTime() < now)
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))

  const basePath = '/patient/consultations'

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.displayName ?? ''}`} description="Your care at a glance" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Next consultation">
          {upcoming ? (
            <Link
              to={`${basePath}/${upcoming.consultationId}`}
              className="block rounded-md border border-slate-200 p-3 hover:border-accent-500"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">
                  {clinicianName(doctors, upcoming.clinicianId)}
                </span>
                <StatusBadge status={upcoming.status} />
              </div>
              <p className="text-xs text-slate-500">
                {formatDateTime(upcoming.scheduledAt)} · {clinicName(clinics, upcoming.clinicId)}
              </p>
            </Link>
          ) : (
            <p className="text-sm text-slate-500">You have no upcoming consultations.</p>
          )}
        </Panel>

        <Panel title="Consultation history">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No past consultations yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.slice(0, 5).map((c) => (
                <li key={c.consultationId} className="flex items-center justify-between py-2 text-sm">
                  <Link to={`${basePath}/${c.consultationId}`} className="text-slate-700 hover:text-accent-700">
                    {clinicianName(doctors, c.clinicianId)}
                    <span className="text-slate-400"> · {formatDateTime(c.scheduledAt)}</span>
                  </Link>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
