/*
 * DataTable — small reusable table (spec §5.5). Readable table on desktop,
 * horizontally scrollable on narrow screens. Row actions are passed in by the
 * caller. This is intentionally NOT a generic mega-table framework.
 */

import type { ReactNode } from 'react'

export interface Column<T> {
  header: string
  /** Cell content for a row. */
  cell: (row: T) => ReactNode
  /** Optional extra classes for the cell (e.g. alignment). */
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  /** Right-aligned action cell (view/edit/delete buttons). */
  actions?: (row: T) => ReactNode
}

export function DataTable<T>({ columns, rows, rowKey, actions }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-2.5 font-medium">
                {col.header}
              </th>
            ))}
            {actions && <th className="px-4 py-2.5 text-right font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.header} className={`px-4 py-3 text-slate-700 ${col.className ?? ''}`}>
                  {col.cell(row)}
                </td>
              ))}
              {actions && (
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
