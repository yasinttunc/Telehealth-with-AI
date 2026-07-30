/*
 * Drawer — right-side panel used for create/edit forms (spec §5.6), instead of
 * a separate route per simple form. Closes on backdrop click or the X button.
 */

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Drawer({ open, title, onClose, children }: DrawerProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  )
}
