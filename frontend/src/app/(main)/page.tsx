export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Sort tabs + create post */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center bg-slate-700 rounded-xl p-1 gap-1">
          {['Hot', 'New', 'Top'].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                i === 0
                  ? 'bg-white text-gray-900'
                  : 'text-gray-50 hover:bg-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded transition-colors shrink-0">
          <span>+</span>
          <span>Create Post</span>
        </button>
      </div>

      {/* Post feed placeholder */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function PostCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-700" />
        <div className="h-3 w-24 bg-slate-700 rounded" />
        <div className="h-3 w-16 bg-slate-700 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-slate-700 rounded" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-full bg-slate-700 rounded" />
        <div className="h-3 w-5/6 bg-slate-700 rounded" />
      </div>
      <div className="flex gap-4">
        <div className="h-3 w-16 bg-slate-700 rounded" />
        <div className="h-3 w-20 bg-slate-700 rounded" />
      </div>
    </div>
  );
}
