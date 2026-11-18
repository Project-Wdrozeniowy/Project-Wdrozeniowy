import { POST_LOADING_LABEL } from '@/pages/post/config/post.const';

export default function PostSkeleton() {
  return (
    <div
      role="status"
      aria-label={POST_LOADING_LABEL}
      aria-busy="true"
      className="bg-surface rounded-xl p-6 flex flex-col gap-4 border border-line"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-raised animate-pulse" />
        <div className="h-3 w-24 bg-raised rounded animate-pulse" />
      </div>
      <div className="h-7 w-2/3 bg-raised rounded animate-pulse" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 bg-raised rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
