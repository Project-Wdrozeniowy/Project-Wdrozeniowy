export default function ForumPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-gray-50 font-bold text-2xl">Forum</h1>

      {/* Category filter placeholder */}
      <div className="flex flex-wrap gap-2">
        {['All', 'AI / Tech', 'Gaming', 'Politics', 'Science', 'Business', 'Education', 'News'].map(
          (cat, i) => (
            <button
              key={cat}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                i === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-gray-50 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ),
        )}
      </div>

      {/* Posts placeholder */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-xl p-5 flex flex-col gap-3 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700" />
              <div className="h-3 w-24 bg-slate-700 rounded" />
            </div>
            <div className="h-5 w-3/4 bg-slate-700 rounded" />
            <div className="h-3 w-full bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
