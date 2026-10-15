import { Suspense } from 'react';
import { CreatePostButton } from '@/features/create-post/CreatePostButton';
import ForumFeed from './_ui/ForumFeed';
import PostFeedSkeleton from '@/app/(main)/_ui/PostFeedSkeleton';

export default function ForumPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-gray-50 font-bold text-2xl">Forum</h1>
        <CreatePostButton />
      </div>
      {/* useSearchParams in ForumFeed needs a Suspense boundary for static rendering */}
      <Suspense fallback={<PostFeedSkeleton />}>
        <ForumFeed />
      </Suspense>
    </div>
  );
}
