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
      className="bg-surface rounded-xl p-8 flex flex-col items-center gap-2 text-center border border-line"
    >
      {title && <p className="text-base font-semibold text-fg">{title}</p>}
      <p className="text-sm text-fg-subtle">{hint}</p>
      {action}
    </div>
  );
}
