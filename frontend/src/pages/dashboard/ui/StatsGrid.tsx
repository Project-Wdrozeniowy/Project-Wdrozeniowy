const STATS = [
  { label: 'Total Posts', value: '45.2K' },
  { label: 'Total Upvotes', value: '25.4K' },
  { label: 'Comments', value: '5.2K' },
  { label: 'Avg. Response', value: '2.3h' },
] as const;

export default function StatsGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STATS.map(({ label, value }) => (
        <div
          key={label}
          className="bg-surface rounded-xl p-4 flex flex-col gap-1 border border-line"
        >
          <span className="text-fg-subtle text-sm">{label}</span>
          <span className="text-fg font-bold text-3xl">{value}</span>
        </div>
      ))}
    </div>
  );
}
