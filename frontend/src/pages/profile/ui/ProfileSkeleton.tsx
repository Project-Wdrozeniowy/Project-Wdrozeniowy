export default function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your profile"
      aria-busy="true"
      className="flex flex-col gap-4"
    >
      <div className="bg-white rounded-xl p-6 flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gray-100 animate-pulse shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
