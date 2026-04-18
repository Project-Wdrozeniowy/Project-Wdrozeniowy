export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Profile card */}
      <div className="bg-white rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl font-bold shrink-0">
            JD
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="flex gap-2 mt-2">
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-100 rounded-xl p-1 flex gap-1 self-start">
        {['Posts', 'Comments', 'Saved', 'Activity'].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
              i === 0
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts placeholder */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 flex flex-col gap-3 animate-pulse"
          >
            <div className="h-5 w-3/4 bg-gray-100 rounded" />
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-3 w-4/5 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
