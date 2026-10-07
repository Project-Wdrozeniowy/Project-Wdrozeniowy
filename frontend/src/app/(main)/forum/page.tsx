import { Suspense } from 'react';
import ForumFeed from './_components/ForumFeed';
import PostFeedSkeleton from './_components/PostFeedSkeleton';

export default function ForumPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-gray-50 font-bold text-2xl">Forum</h1>
      {/* useSearchParams in ForumFeed needs a Suspense boundary for static rendering */}
      <Suspense fallback={<PostFeedSkeleton />}>
        <ForumFeed />
      </Suspense>
    </div>
  );
}
