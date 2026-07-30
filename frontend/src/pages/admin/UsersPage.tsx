/*
 * UsersPage (admin only, spec §5.5/§5.6) — intentionally minimal: a list plus a
 * basic create/edit form. Password is only set on creation (spec §5.6). Enabled
 * flag lets an admin disable login without deleting history.
 */

import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { api, ApiError } from '../../api'
import { DataTable, type Column } from '../../components/DataTable'
import { Drawer } from '../../components/Drawer'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { FormField } from '../../components/FormField'
import { inputClass, selectClass } from '../../components/formStyles'
import { PageHeader, PrimaryButton, IconButton, LoadingRow, ErrorRow } from '../../components/ui'
import type { AppUser, Role } from '../../types/domain'

const ROLES: Role[] = ['ADMIN', 'DOCTOR', 'PATIENT']

interface UserForm {
  username: string
  email: string
  role: Role
  password: string
  enabled: boolean
}

const emptyForm: UserForm = { username: '', email: '', role: 'PATIENT', password: '', enabled: true }

export function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setUsers(await api.users.list())
      setError(null)
    } catch {
      setError('Could not load users.')
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

  function openEdit(u: AppUser) {
    setEditing(u)
    setForm({ username: u.username, email: u.email, role: u.role, password: '', enabled: u.enabled })
    setFieldErrors({})
    setDrawerOpen(true)
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!form.username.trim()) errs.username = 'Username is required'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) errs.email = 'Enter a valid email'
    if (!editing && form.password.length < 4) errs.password = 'Password must be at least 4 characters'
    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      if (editing) {
        await api.users.update(editing.userId, {
          username: form.username,
          email: form.email,
          role: form.role,
          enabled: form.enabled,
        })
      } else {
        await api.users.create({
          username: form.username,
          email: form.email,
          role: form.role,
          password: form.password,
        })
      }
      setDrawerOpen(false)
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setFieldErrors(err.fieldErrors)
      else if (err instanceof ApiError) setError(err.message)
      else setError('Could not save user.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.users.remove(deleteTarget.userId)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete user.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<AppUser>[] = [
    { header: 'Username', cell: (u) => u.username },
    { header: 'Email', cell: (u) => <span className="text-slate-500">{u.email}</span> },
    { header: 'Role', cell: (u) => u.role },
    {
      header: 'Enabled',
      cell: (u) =>
        u.enabled ? (
          <span className="text-accent-700">Yes</span>
        ) : (
          <span className="text-slate-400">No</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="User management"
        description="Administer login accounts"
        actions={
          <PrimaryButton type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden />
            Add user
          </PrimaryButton>
        }
      />

      {error && <div className="mb-3"><ErrorRow message={error} /></div>}

      {loading ? (
        <LoadingRow />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users"
          message="Add the first user account."
          action={
            <PrimaryButton type="button" onClick={openCreate} className="mx-auto">
              <Plus size={16} aria-hidden />
              Add user
            </PrimaryButton>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(u) => u.userId}
          actions={(u) => (
            <>
              <IconButton label="Edit user" onClick={() => openEdit(u)}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label="Delete user" danger onClick={() => setDeleteTarget(u)}>
                <Trash2 size={16} />
              </IconButton>
            </>
          )}
        />
      )}

      <Drawer open={drawerOpen} title={editing ? 'Edit user' : 'Add user'} onClose={() => setDrawerOpen(false)}>
        <form onSubmit={handleSubmit} noValidate>
          <FormField id="u-username" label="Username" required error={fieldErrors.username}>
            <input
              id="u-username"
              className={inputClass}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </FormField>
          <FormField id="u-email" label="Email" required error={fieldErrors.email}>
            <input
              id="u-email"
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField id="u-role" label="Role" required>
            <select
              id="u-role"
              className={selectClass}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </FormField>

          {!editing && (
            <FormField id="u-password" label="Password" required error={fieldErrors.password} hint="Set only on creation">
              <input
                id="u-password"
                type="password"
                className={inputClass}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </FormField>
          )}

          {editing && (
            <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-4 w-4"
              />
              Account enabled
            </label>
          )}

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
        title="Delete user"
        message={deleteTarget ? `Delete account "${deleteTarget.username}"? This cannot be undone.` : ''}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
