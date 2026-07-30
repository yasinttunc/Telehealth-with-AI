/*
 * DoctorsPage — one component reused across roles (spec §4):
 *   - ADMIN (/admin/doctors): full management (add/edit/delete).
 *   - DOCTOR (/doctors) and PATIENT (/patient/doctors): read-only directory.
 * Behaviour is driven by the current role, not by duplicated page files.
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
import type { Doctor } from '../types/domain'
import type { CreateDoctorRequest } from '../api/types'

interface DoctorForm {
  firstName: string
  lastName: string
  specialty: string
  availableTimes: string // comma-separated in the form
}

const emptyForm: DoctorForm = { firstName: '', lastName: '', specialty: '', availableTimes: '' }

export function DoctorsPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN'

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [form, setForm] = useState<DoctorForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setDoctors(await api.doctors.list())
      setError(null)
    } catch {
      setError('Could not load doctors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return doctors
    return doctors.filter((d) =>
      `${d.firstName} ${d.lastName} ${d.specialty}`.toLowerCase().includes(q),
    )
  }, [doctors, search])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
    setDrawerOpen(true)
  }

  function openEdit(d: Doctor) {
    setEditing(d)
    setForm({
      firstName: d.firstName,
      lastName: d.lastName,
      specialty: d.specialty,
      availableTimes: d.availableTimes.join(', '),
    })
    setFieldErrors({})
    setDrawerOpen(true)
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = 'First name is required'
    if (!form.lastName.trim()) errs.lastName = 'Last name is required'
    if (!form.specialty.trim()) errs.specialty = 'Specialty is required'
    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload: CreateDoctorRequest = {
      firstName: form.firstName,
      lastName: form.lastName,
      specialty: form.specialty,
      availableTimes: form.availableTimes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    setSaving(true)
    try {
      if (editing) await api.doctors.update(editing.doctorId, payload)
      else await api.doctors.create(payload)
      setDrawerOpen(false)
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setFieldErrors(err.fieldErrors)
      else setError('Could not save doctor.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.doctors.remove(deleteTarget.doctorId)
      setDeleteTarget(null)
      await load()
    } catch {
      setError('Could not delete doctor.')
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<Doctor>[] = [
    { header: 'Name', cell: (d) => `Dr ${d.firstName} ${d.lastName}` },
    { header: 'Specialty', cell: (d) => d.specialty },
    {
      header: 'Available times',
      cell: (d) =>
        d.availableTimes.length ? (
          <span className="text-slate-500">{d.availableTimes.join(', ')}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={canManage ? 'Doctor management' : 'Doctor directory'}
        description={canManage ? 'Add, edit, or remove doctors' : 'Find a clinician and their specialty'}
        actions={
          canManage ? (
            <PrimaryButton type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden />
              Add doctor
            </PrimaryButton>
          ) : undefined
        }
      />

      <div className="mb-4">
        <label htmlFor="doctor-search" className="sr-only">
          Search doctors
        </label>
        <input
          id="doctor-search"
          type="search"
          placeholder="Search by name or specialty…"
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
          title="No doctors found"
          message={canManage ? 'Add the first doctor to get started.' : 'No matching doctors.'}
          action={
            canManage ? (
              <PrimaryButton type="button" onClick={openCreate} className="mx-auto">
                <Plus size={16} aria-hidden />
                Add doctor
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(d) => d.doctorId}
          actions={
            canManage
              ? (d) => (
                  <>
                    <IconButton label="Edit doctor" onClick={() => openEdit(d)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton label="Delete doctor" danger onClick={() => setDeleteTarget(d)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </>
                )
              : undefined
          }
        />
      )}

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit doctor' : 'Add doctor'}
        onClose={() => setDrawerOpen(false)}
      >
        <form onSubmit={handleSubmit} noValidate>
          <FormField id="firstName" label="First name" required error={fieldErrors.firstName}>
            <input
              id="firstName"
              className={inputClass}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </FormField>
          <FormField id="lastName" label="Last name" required error={fieldErrors.lastName}>
            <input
              id="lastName"
              className={inputClass}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </FormField>
          <FormField id="specialty" label="Specialty" required error={fieldErrors.specialty}>
            <input
              id="specialty"
              className={inputClass}
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            />
          </FormField>
          <FormField
            id="availableTimes"
            label="Available times"
            hint="Comma-separated, e.g. Mon 09:00, Wed 13:00"
          >
            <input
              id="availableTimes"
              className={inputClass}
              value={form.availableTimes}
              onChange={(e) => setForm({ ...form, availableTimes: e.target.value })}
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
        title="Delete doctor"
        message={
          deleteTarget
            ? `Remove Dr ${deleteTarget.firstName} ${deleteTarget.lastName}? This cannot be undone.`
            : ''
        }
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
