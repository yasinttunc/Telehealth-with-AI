/* Brief inline confirmation used after a completed API mutation. */

export function SuccessMessage({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
    >
      {message}
    </p>
  )
}
