interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export default function ChartCard({ title, children }: ChartCardProps) {
  return (
    <section
      aria-label={title}
      className="bg-surface rounded-xl p-5 flex flex-col gap-4 border border-line"
    >
      <h2 className="text-fg font-semibold text-xl">{title}</h2>
      {children}
    </section>
  );
}
