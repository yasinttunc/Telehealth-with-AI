/*
 * FormField — labelled input/select wrapper (spec §6: every input has a
 * visible label). Shows a per-field error message under the control, which is
 * where server/mock validation errors are attached (spec §5.6).
 */

import type { ReactNode } from 'react'

interface FieldProps {
  id: string
  label: string
  error?: string
  required?: boolean
  children: ReactNode
  hint?: string
}

export function FormField({ id, label, error, required, children, hint }: FieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
