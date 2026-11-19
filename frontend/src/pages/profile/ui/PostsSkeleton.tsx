import { PROFILE_POSTS_UNAVAILABLE_LABEL } from '@/pages/profile/config/profileView.const';

/**
 * Stands where the user's posts will go. Nothing is loading them yet (the content is PWDRZ-60), so
 * it says so in plain text instead of claiming to load, and its blocks do not pulse. It is not a
 * live region: the text never changes, so a status role would announce nothing.
 */
export default function PostsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-fg-subtle text-sm">{PROFILE_POSTS_UNAVAILABLE_LABEL}</p>
      <div aria-hidden="true" className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl p-5 flex flex-col gap-3">
            <div className="h-5 w-3/4 bg-raised rounded" />
            <div className="h-3 w-full bg-raised rounded" />
            <div className="h-3 w-4/5 bg-raised rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
