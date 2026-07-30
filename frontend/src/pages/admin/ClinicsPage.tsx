/*
 * ClinicsPage (admin, spec §4) — minimal mock CRUD: list + name/address form.
 * Clinics are a planned backend feature, so this runs entirely on mockApi.
 */

import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { api } from '../../api'
import { DataTable, type Column } from '../../components/DataTable'
import { Drawer } from '../../components/Drawer'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { FormField } from '../../components/FormField'
import { inputClass } from '../../components/formStyles'
import { PageHeader, PrimaryButton, IconButton, LoadingRow, ErrorRow } from '../../components/ui'
import type { Clinic } from '../../types/domain'

interface ClinicForm {
  name: string
  address: string
}

const emptyForm: ClinicForm = { name: '', address: '' }

export function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Clinic | null>(null)
  const [form, setForm] = useState<ClinicForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Clinic | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setClinics(await api.clinics.list())
      setError(null)
    } catch {
      setError('Could not load clinics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
    setDrawerOpen(true)
  }

  function openEdit(c: Clinic) {
    setEditing(c)
    setForm({ name: c.name, address: c.address })
    setFieldErrors({})
    setDrawerOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.address.trim()) errs.address = 'Address is required'
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      if (editing) await api.clinics.update(editing.clinicId, form)
      else await api.clinics.create(form)
      setDrawerOpen(false)
      await load()
    } catch {
      setError('Could not save clinic.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.clinics.remove(deleteTarget.clinicId)
      setDeleteTarget(null)
      await load()
    } catch {
      setError('Could not delete clinic.')
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<Clinic>[] = [
    { header: 'Name', cell: (c) => <span className="font-medium text-slate-800">{c.name}</span> },
    { header: 'Address', cell: (c) => <span className="text-slate-500">{c.address}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Clinics"
        description="Manage clinic locations"
        actions={
          <PrimaryButton type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden />
            Add clinic
          </PrimaryButton>
        }
      />

      {error && <div className="mb-3"><ErrorRow message={error} /></div>}

      {loading ? (
        <LoadingRow />
      ) : clinics.length === 0 ? (
        <EmptyState
          title="No clinics"
          message="Add the first clinic."
          action={
            <PrimaryButton type="button" onClick={openCreate} className="mx-auto">
              <Plus size={16} aria-hidden />
              Add clinic
            </PrimaryButton>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={clinics}
          rowKey={(c) => c.clinicId}
          actions={(c) => (
            <>
              <IconButton label="Edit clinic" onClick={() => openEdit(c)}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label="Delete clinic" danger onClick={() => setDeleteTarget(c)}>
                <Trash2 size={16} />
              </IconButton>
            </>
          )}
        />
      )}

      <Drawer open={drawerOpen} title={editing ? 'Edit clinic' : 'Add clinic'} onClose={() => setDrawerOpen(false)}>
        <form onSubmit={handleSubmit} noValidate>
          <FormField id="cl-name" label="Name" required error={fieldErrors.name}>
            <input
              id="cl-name"
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField id="cl-address" label="Address" required error={fieldErrors.address}>
            <input
              id="cl-address"
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
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
        title="Delete clinic"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ''}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
