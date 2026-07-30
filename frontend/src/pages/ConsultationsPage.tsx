/*
 * ConsultationsPage — one list reused across roles (spec §4), filtered by role:
 *   - ADMIN: all consultations, can create.
 *   - DOCTOR: only consultations assigned to them, can create.
 *   - PATIENT: only their own consultations, read-only.
 * Ownership filtering is applied when calling the API, so a patient never
 * receives another patient's rows (spec §7).
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth/useAuth'
import { DataTable, type Column } from '../components/DataTable'
import { Drawer } from '../components/Drawer'
import { EmptyState } from '../components/EmptyState'
import { FormField } from '../components/FormField'
import { inputClass, selectClass } from '../components/formStyles'
import { StatusBadge } from '../components/StatusBadge'
import { PageHeader, PrimaryButton, IconButton, LoadingRow, ErrorRow } from '../components/ui'
import { formatDateTime, fromInputDateTime } from '../lib/format'
import { clinicName, clinicianName, patientName } from '../lib/lookups'
import { consultationsBase } from '../lib/paths'
import type {
  Clinic,
  Consultation,
  ConsultationStatus,
  Doctor,
  Patient,
} from '../types/domain'
import type { CreateConsultationRequest } from '../api/types'

const STATUSES: ConsultationStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

interface ConsultForm {
  patientId: string
  clinicianId: string
  clinicId: string
  scheduledAt: string
  status: ConsultationStatus
}

export function ConsultationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canManage = user?.role === 'ADMIN' || user?.role === 'DOCTOR'
  const base = user ? consultationsBase(user.role) : '/login'

  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<ConsultForm | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      const query =
        user.role === 'PATIENT'
          ? { patientId: user.patientId }
          : user.role === 'DOCTOR'
            ? { clinicianId: user.userId }
            : {}
      const [cons, pts, docs, clns] = await Promise.all([
        api.consultations.list(query),
        api.patients.list(),
        api.doctors.list(),
        api.clinics.list(),
      ])
      setConsultations(cons)
      setPatients(pts)
      setDoctors(docs)
      setClinics(clns)
      setError(null)
    } catch {
      setError('Could not load consultations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /** Clinician options are AppUser IDs; doctors link via appUserId. */
  const clinicianOptions = useMemo(
    () => doctors.filter((d) => d.appUserId != null),
    [doctors],
  )

  function openCreate() {
    setForm({
      patientId: patients[0] ? String(patients[0].patientId) : '',
      // Doctor creating their own appointment defaults to themselves.
      clinicianId:
        user?.role === 'DOCTOR'
          ? String(user.userId)
          : clinicianOptions[0]
            ? String(clinicianOptions[0].appUserId)
            : '',
      clinicId: clinics[0] ? String(clinics[0].clinicId) : '',
      scheduledAt: '',
      status: 'SCHEDULED',
    })
    setFieldErrors({})
    setDrawerOpen(true)
  }

  function validate(f: ConsultForm): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!f.patientId) errs.patientId = 'Select a patient'
    if (!f.clinicianId) errs.clinicianId = 'Select a clinician'
    if (!f.clinicId) errs.clinicId = 'Select a clinic'
    if (!f.scheduledAt) errs.scheduledAt = 'Choose a date and time'
    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    const errs = validate(form)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload: CreateConsultationRequest = {
      patientId: Number(form.patientId),
      clinicianId: Number(form.clinicianId),
      clinicId: Number(form.clinicId),
      scheduledAt: fromInputDateTime(form.scheduledAt),
      status: form.status,
    }
    setSaving(true)
    try {
      await api.consultations.create(payload)
      setDrawerOpen(false)
      await load()
    } catch {
      setError('Could not create consultation.')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Consultation>[] = [
    { header: 'Patient', cell: (c) => patientName(patients, c.patientId) },
    { header: 'Clinician', cell: (c) => clinicianName(doctors, c.clinicianId) },
    { header: 'Clinic', cell: (c) => <span className="text-slate-500">{clinicName(clinics, c.clinicId)}</span> },
    { header: 'Scheduled', cell: (c) => formatDateTime(c.scheduledAt) },
    { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
  ]

  // Patients see their clinician first (their own name is redundant).
  const patientColumns = columns.filter((c) => c.header !== 'Patient')

  return (
    <div>
      <PageHeader
        title={user?.role === 'PATIENT' ? 'My consultations' : 'Consultations'}
        description={user?.role === 'DOCTOR' ? 'Consultations assigned to you' : undefined}
        actions={
          canManage ? (
            <PrimaryButton type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden />
              New consultation
            </PrimaryButton>
          ) : undefined
        }
      />

      {error && <div className="mb-3"><ErrorRow message={error} /></div>}

      {loading ? (
        <LoadingRow />
      ) : consultations.length === 0 ? (
        <EmptyState
          title="No consultations"
          message={canManage ? 'Create the first consultation.' : 'You have no consultations yet.'}
          action={
            canManage ? (
              <PrimaryButton type="button" onClick={openCreate} className="mx-auto">
                <Plus size={16} aria-hidden />
                New consultation
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={user?.role === 'PATIENT' ? patientColumns : columns}
          rows={consultations}
          rowKey={(c) => c.consultationId}
          actions={(c) => (
            <IconButton label="Open consultation" onClick={() => navigate(`${base}/${c.consultationId}`)}>
              <Eye size={16} />
            </IconButton>
          )}
        />
      )}

      {form && (
        <Drawer open={drawerOpen} title="New consultation" onClose={() => setDrawerOpen(false)}>
          <form onSubmit={handleSubmit} noValidate>
            <FormField id="c-patient" label="Patient" required error={fieldErrors.patientId}>
              <select
                id="c-patient"
                className={selectClass}
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              >
                <option value="">Select…</option>
                {patients.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="c-clinician" label="Clinician" required error={fieldErrors.clinicianId}>
              <select
                id="c-clinician"
                className={selectClass}
                value={form.clinicianId}
                onChange={(e) => setForm({ ...form, clinicianId: e.target.value })}
                disabled={user?.role === 'DOCTOR'}
              >
                <option value="">Select…</option>
                {clinicianOptions.map((d) => (
                  <option key={d.doctorId} value={d.appUserId}>
                    Dr {d.firstName} {d.lastName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="c-clinic" label="Clinic" required error={fieldErrors.clinicId}>
              <select
                id="c-clinic"
                className={selectClass}
                value={form.clinicId}
                onChange={(e) => setForm({ ...form, clinicId: e.target.value })}
              >
                <option value="">Select…</option>
                {clinics.map((c) => (
                  <option key={c.clinicId} value={c.clinicId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="c-time" label="Scheduled time" required error={fieldErrors.scheduledAt}>
              <input
                id="c-time"
                type="datetime-local"
                className={inputClass}
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </FormField>

            <FormField id="c-status" label="Status">
              <select
                id="c-status"
                className={selectClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ConsultationStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-10 rounded-md border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Create'}
              </PrimaryButton>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  )
}
