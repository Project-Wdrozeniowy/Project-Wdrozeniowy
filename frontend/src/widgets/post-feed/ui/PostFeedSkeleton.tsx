import SkeletonStatus from '@/shared/ui/SkeletonStatus';

interface PostFeedSkeletonProps {
  /** Shown to everyone and used as the accessible name, e.g. "Loading page 2…". */
  label?: string;
}

export default function PostFeedSkeleton({ label = 'Loading posts…' }: PostFeedSkeletonProps) {
  return (
    <SkeletonStatus label={label} showLabel className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-surface rounded-xl p-5 flex flex-col gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-raised" />
            <div className="h-3 w-24 bg-raised rounded" />
          </div>
          <div className="h-5 w-3/4 bg-raised rounded" />
          <div className="h-3 w-full bg-raised rounded" />
        </div>
      ))}
    </SkeletonStatus>
  );
}
