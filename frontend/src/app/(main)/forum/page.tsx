import CategoryFilter from './_components/CategoryFilter';
import PostFeedSkeleton from './_components/PostFeedSkeleton';

export default function ForumPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-gray-50 font-bold text-2xl">Forum</h1>
      <CategoryFilter />
      <PostFeedSkeleton />
    </div>
  );
}
