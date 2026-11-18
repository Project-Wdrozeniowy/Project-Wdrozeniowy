export default function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your profile"
      aria-busy="true"
      className="flex flex-col gap-4"
    >
      <div className="bg-surface rounded-xl p-6 flex items-center gap-4 border border-line">
        <div className="w-24 h-24 rounded-full bg-raised animate-pulse shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 bg-raised rounded animate-pulse" />
          <div className="h-4 w-24 bg-raised rounded animate-pulse" />
          <div className="h-4 w-48 bg-raised rounded animate-pulse" />
        </div>
      </div>
      <div className="bg-surface rounded-xl p-6 flex flex-col gap-4 border border-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-raised rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
