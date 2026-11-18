import { PROFILE_POSTS_LOADING_LABEL } from '@/pages/profile/config/profileView.const';

export default function PostsSkeleton() {
  return (
    <div
      role="status"
      aria-label={PROFILE_POSTS_LOADING_LABEL}
      aria-busy="true"
      className="flex flex-col gap-3"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface rounded-xl p-5 flex flex-col gap-3 animate-pulse border border-line"
        >
          <div className="h-5 w-3/4 bg-raised rounded" />
          <div className="h-3 w-full bg-raised rounded" />
          <div className="h-3 w-4/5 bg-raised rounded" />
        </div>
      ))}
    </div>
  );
}
