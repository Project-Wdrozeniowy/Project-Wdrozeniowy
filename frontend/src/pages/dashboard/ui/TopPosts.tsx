export default function TopPosts() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <h2 className="text-gray-50 font-semibold text-xl">Top Performing Posts</h2>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0"
          >
            <span className="text-slate-400 font-bold text-base w-4">#{i + 1}</span>
            <div className="flex-1 h-4 bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-12 bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
