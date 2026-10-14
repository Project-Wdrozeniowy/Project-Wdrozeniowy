/**
 * Shown by the route guards while AuthProvider restores the session from the
 * refresh cookie, so protected content neither flashes nor redirects early.
 */
export default function SessionLoader() {
  return (
    <div role="status" aria-live="polite" className="flex justify-center py-16">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
