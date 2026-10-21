import type { ReactNode } from 'react';

interface ResultSectionProps {
  title: string;
  children: ReactNode;
}

export default function ResultSection({ title, children }: ResultSectionProps) {
  return (
    <section aria-label={title} className="bg-slate-800 rounded-xl overflow-hidden">
      <h2 className="px-4 py-2 bg-slate-900/50 border-b border-slate-700 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <ul className="divide-y divide-slate-700">{children}</ul>
    </section>
  );
}
