import type { ReactNode } from 'react';

interface SearchMessageProps {
  title: string;
  hint: string;
  /** `alert` is announced at once, for a failure; `status` politely. */
  role?: 'status' | 'alert';
  action?: ReactNode;
}

/** Centered notice in the dropdown: no results, a failure, a hint. */
export default function SearchMessage({
  title,
  hint,
  role = 'status',
  action,
}: SearchMessageProps) {
  return (
    <div role={role} className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className="text-xs text-slate-400">{hint}</p>
      {action}
    </div>
  );
}
