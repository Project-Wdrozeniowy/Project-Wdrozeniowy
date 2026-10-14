export default function PostsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 flex flex-col gap-3 animate-pulse">
          <div className="h-5 w-3/4 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="h-3 w-4/5 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}
