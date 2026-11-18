interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  /** Spans both columns of the chart grid. */
  wide?: boolean;
}

export default function ChartCard({ title, children, wide = false }: ChartCardProps) {
  return (
    <section
      aria-label={title}
      className={`bg-surface rounded-xl p-5 flex flex-col gap-4 border border-line${wide ? ' lg:col-span-2' : ''}`}
    >
      <h2 className="text-fg font-semibold text-xl">{title}</h2>
      {children}
    </section>
  );
}
