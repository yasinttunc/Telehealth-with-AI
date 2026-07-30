/* Shared form-control styling so every input/select has the same ~40px height
 * (spec §6). Kept out of FormField.tsx so that file only exports a component. */

export const inputClass =
  'h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-accent-500'
export const selectClass = inputClass
