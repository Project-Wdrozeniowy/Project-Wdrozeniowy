import type { ReactNode } from 'react';

interface SearchNoticeProps {
  title?: string;
  hint: string;
  role?: 'status' | 'alert';
  action?: ReactNode;
}

/** A centered message on the results page: hint, nothing found, a failure. */
export default function SearchNotice({ title, hint, role = 'status', action }: SearchNoticeProps) {
  return (
    <div
      role={role}
      className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-2 text-center"
    >
      {title && <p className="text-base font-semibold text-slate-100">{title}</p>}
      <p className="text-sm text-slate-400">{hint}</p>
      {action}
    </div>
  );
}
