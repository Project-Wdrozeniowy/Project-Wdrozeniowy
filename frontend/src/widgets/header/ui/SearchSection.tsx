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
        className="px-3 py-1 bg-page/50 border-y border-line text-xs font-semibold uppercase tracking-wide text-fg-subtle"
      >
        {title}
      </div>
      {children}
    </div>
  );
}
