import type { ReactNode } from 'react';

interface ResultSectionProps {
  title: string;
  children: ReactNode;
}

export default function ResultSection({ title, children }: ResultSectionProps) {
  return (
    <section
      aria-label={title}
      className="bg-surface rounded-xl overflow-hidden border border-line"
    >
      <h2 className="px-4 py-2 bg-page/50 border-b border-line text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {title}
      </h2>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}
