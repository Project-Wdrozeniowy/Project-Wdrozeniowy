export default function ChartCard({ title }: { title: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <h2 className="text-gray-50 font-semibold text-xl">{title}</h2>
      <div className="h-40 bg-slate-700 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-slate-500 text-sm">Chart coming soon</span>
      </div>
    </div>
  );
}
