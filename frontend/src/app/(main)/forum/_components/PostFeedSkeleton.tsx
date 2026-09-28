export default function PostFeedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-slate-800 rounded-xl p-5 flex flex-col gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700" />
            <div className="h-3 w-24 bg-slate-700 rounded" />
          </div>
          <div className="h-5 w-3/4 bg-slate-700 rounded" />
          <div className="h-3 w-full bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  );
}
