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
        <div key={label} className="bg-slate-800 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-slate-400 text-sm">{label}</span>
          <span className="text-gray-50 font-bold text-3xl">{value}</span>
        </div>
      ))}
    </div>
  );
}
