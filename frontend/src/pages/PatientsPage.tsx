/*
 * PatientsPage — shared by ADMIN (/admin/patients) and DOCTOR (/doctor/patients).
 * Both roles may add and edit patients (backend allows ADMIN/DOCTOR); delete is
 * ADMIN-only (matches PatientController RBAC). Driven by role, not duplicated.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/useAuth'
import { DataTable, type Column } from '../components/DataTable'
import { Drawer } from '../components/Drawer'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { FormField } from '../components/FormField'
import { inputClass } from '../components/formStyles'
import { PageHeader, PrimaryButton, IconButton, LoadingRow, ErrorRow } from '../components/ui'
import { formatDate } from '../lib/format'
import type { Patient } from '../types/domain'
import type { CreatePatientRequest } from '../api/types'

interface PatientForm {
  firstName: string
  lastName: string
  nhsNumber: string
  dateOfBirth: string
}

const emptyForm: PatientForm = { firstName: '', lastName: '', nhsNumber: '', dateOfBirth: '' }

export function PatientsPage() {
  const { user } = useAuth()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'DOCTOR'
  const canDelete = user?.role === 'ADMIN'

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [form, setForm] = useState<PatientForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setPatients(await api.patients.list())
      setError(null)
    } catch {
      setError('Could not load patients.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.nhsNumber}`.toLowerCase().includes(q),
    )
  }, [patients, search])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
    setDrawerOpen(true)
  }

  function openEdit(p: Patient) {
    setEditing(p)
    setForm({ firstName: p.firstName, lastName: p.lastName, nhsNumber: p.nhsNumber, dateOfBirth: p.dateOfBirth })
    setFieldErrors({})
    setDrawerOpen(true)
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = 'First name is required'
    if (!form.lastName.trim()) errs.lastName = 'Last name is required'
    if (!/^\d{10}$/.test(form.nhsNumber.trim())) errs.nhsNumber = 'NHS number must be 10 digits'
    if (!form.dateOfBirth) errs.dateOfBirth = 'Date of birth is required'
    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload: CreatePatientRequest = {
      firstName: form.firstName,
      lastName: form.lastName,
      nhsNumber: form.nhsNumber,
      dateOfBirth: form.dateOfBirth,
    }
    setSaving(true)
    try {
      if (editing) await api.patients.update(editing.patientId, payload)
      else await api.patients.create(payload)
      setDrawerOpen(false)
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setFieldErrors(err.fieldErrors)
      else setError('Could not save patient.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.patients.remove(deleteTarget.patientId)
      setDeleteTarget(null)
      await load()
    } catch {
      setError('Could not delete patient.')
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<Patient>[] = [
    { header: 'Name', cell: (p) => `${p.firstName} ${p.lastName}` },
    { header: 'NHS number', cell: (p) => <span className="font-mono text-slate-600">{p.nhsNumber}</span> },
    { header: 'Date of birth', cell: (p) => formatDate(p.dateOfBirth) },
  ]

  return (
    <div>
      <PageHeader
        title="Patients"
        description={canEdit ? 'Manage patient records' : 'Patient records'}
        actions={
          canEdit ? (
            <PrimaryButton type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden />
              Add patient
            </PrimaryButton>
          ) : undefined
        }
      />

      <div className="mb-4">
        <label htmlFor="patient-search" className="sr-only">
          Search patients
        </label>
        <input
          id="patient-search"
          type="search"
          placeholder="Search by name or NHS number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} max-w-xs`}
        />
      </div>

      {error && <div className="mb-3"><ErrorRow message={error} /></div>}

      {loading ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No patients found"
          message={canEdit ? 'Add the first patient to get started.' : 'No matching patients.'}
          action={
            canEdit ? (
              <PrimaryButton type="button" onClick={openCreate} className="mx-auto">
                <Plus size={16} aria-hidden />
                Add patient
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.patientId}
          actions={
            canEdit
              ? (p) => (
                  <>
                    <IconButton label="Edit patient" onClick={() => openEdit(p)}>
                      <Pencil size={16} />
                    </IconButton>
                    {canDelete && (
                      <IconButton label="Delete patient" danger onClick={() => setDeleteTarget(p)}>
                        <Trash2 size={16} />
                      </IconButton>
                    )}
                  </>
                )
              : undefined
          }
        />
      )}

      <Drawer open={drawerOpen} title={editing ? 'Edit patient' : 'Add patient'} onClose={() => setDrawerOpen(false)}>
        <form onSubmit={handleSubmit} noValidate>
          <FormField id="p-firstName" label="First name" required error={fieldErrors.firstName}>
            <input
              id="p-firstName"
              className={inputClass}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </FormField>
          <FormField id="p-lastName" label="Last name" required error={fieldErrors.lastName}>
            <input
              id="p-lastName"
              className={inputClass}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </FormField>
          <FormField id="p-nhs" label="NHS number" required error={fieldErrors.nhsNumber} hint="10 digits">
            <input
              id="p-nhs"
              className={inputClass}
              value={form.nhsNumber}
              onChange={(e) => setForm({ ...form, nhsNumber: e.target.value })}
              inputMode="numeric"
            />
          </FormField>
          <FormField id="p-dob" label="Date of birth" required error={fieldErrors.dateOfBirth}>
            <input
              id="p-dob"
              type="date"
              className={inputClass}
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
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
              {saving ? 'Saving…' : 'Save'}
            </PrimaryButton>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete patient"
        message={
          deleteTarget ? `Remove ${deleteTarget.firstName} ${deleteTarget.lastName}? This cannot be undone.` : ''
        }
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
