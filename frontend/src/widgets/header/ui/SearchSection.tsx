import type { ReactNode } from 'react';

interface SearchSectionProps {
  title: string;
  children: ReactNode;
}

/** One kind of result in the dropdown: a caption bar and its rows. */
export default function SearchSection({ title, children }: SearchSectionProps) {
  return (
    <div role="group" aria-label={title}>
      <div
        aria-hidden="true"
        className="px-3 py-1 bg-slate-900/50 border-y border-slate-700 text-xs font-semibold uppercase tracking-wide text-slate-400"
      >
        {title}
      </div>
      {children}
    </div>
  );
}
