export default function DashboardPage() {
  const stats = [
    { label: 'Total Posts', value: '45.2K' },
    { label: 'Total Upvotes', value: '25.4K' },
    { label: 'Comments', value: '5.2K' },
    { label: 'Avg. Response', value: '2.3h' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-gray-50 font-bold text-3xl">Analytics Dashboard</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-slate-400 text-sm">{label}</span>
            <span className="text-gray-50 font-bold text-3xl">{value}</span>
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Posts Over Time" />
        <ChartCard title="Engagement Trends" />
        <ChartCard title="Topic Distribution" />
        <ChartCard title="User Activity by Hour" />
      </div>

      {/* Top posts placeholder */}
      <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
        <h2 className="text-gray-50 font-semibold text-xl">Top Performing Posts</h2>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0">
              <span className="text-slate-400 font-bold text-base w-4">
                #{i + 1}
              </span>
              <div className="flex-1 h-4 bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title }: { title: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <h2 className="text-gray-50 font-semibold text-xl">{title}</h2>
      <div className="h-40 bg-slate-700 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-slate-500 text-sm">Chart coming soon</span>
      </div>
    </div>
  );
}
