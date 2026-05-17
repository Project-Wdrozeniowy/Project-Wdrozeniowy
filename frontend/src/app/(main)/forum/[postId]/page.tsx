export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;

  return (
    <div className="flex flex-col gap-6">
      {/* Post content placeholder */}
      <div className="bg-slate-800 rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
          <div className="h-3 w-24 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="h-7 w-2/3 bg-slate-700 rounded animate-pulse" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 bg-slate-700 rounded animate-pulse" />
          ))}
        </div>
        <div className="flex gap-4">
          <div className="h-3 w-16 bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-20 bg-slate-700 rounded animate-pulse" />
        </div>
        <p className="text-slate-500 text-xs">Post ID: {postId}</p>
      </div>

      {/* Comments placeholder */}
      <div className="flex flex-col gap-3">
        <h2 className="text-gray-50 font-semibold text-lg">Comments</h2>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-700 animate-pulse" />
              <div className="h-3 w-20 bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="h-3 w-full bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
