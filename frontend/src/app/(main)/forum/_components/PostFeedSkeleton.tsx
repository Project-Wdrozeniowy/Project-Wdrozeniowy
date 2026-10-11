import { useId } from 'react';

interface PostFeedSkeletonProps {
  /** Shown to everyone and used as the accessible name, e.g. "Loading page 2…". */
  label?: string;
}

export default function PostFeedSkeleton({ label = 'Loading posts…' }: PostFeedSkeletonProps) {
  const labelId = useId();

  return (
    <div role="status" aria-labelledby={labelId} aria-busy="true" className="flex flex-col gap-3">
      {/* One source for the name: the visible text, so it is read once. */}
      <p id={labelId} className="text-slate-400 text-sm">
        {label}
      </p>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
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
  );
}
