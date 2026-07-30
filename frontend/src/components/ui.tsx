/*
 * Small shared UI primitives used across pages. Kept together to avoid a file
 * per one-line component while still keeping page code readable.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Page header: title on the left, optional action(s) on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Primary command button (spec §6: buttons are commands). */
export function PrimaryButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex h-10 items-center gap-1.5 rounded-md bg-accent-600 px-4 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-60 ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Secondary/outline button. */
export function SecondaryButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Icon-only row action. Requires an accessible label + tooltip (spec §6). */
export function IconButton({
  label,
  danger,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100 ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-500'
      } ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Compact panel used for detail sections and small summary blocks. */
export function Panel({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-4 ${className ?? ''}`}>
      {title && <h3 className="mb-3 text-base font-semibold text-slate-800">{title}</h3>}
      {children}
    </section>
  )
}

/** Small labelled statistic block for dashboards (spec §5.2). */
export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  )
}

export function LoadingRow({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-8 text-center text-sm text-slate-400">{label}</p>
}

export function ErrorRow({ message }: { message: string }) {
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {message}
    </p>
  )
}
