'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PostCard from '@/app/_components/PostCard';
import { ALL_TOPICS, isTopic } from '@/constants/categories';
import { usePosts } from '@/hooks/usePosts';
import CategoryFilter from './CategoryFilter';
import PostFeedSkeleton from './PostFeedSkeleton';

/** Post list filtered by the `?topic=` query parameter, so filters are linkable and survive reload. */
export default function ForumFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: posts, isLoading } = usePosts();

  const topicParam = searchParams.get('topic');
  const activeTopic = isTopic(topicParam) ? topicParam : ALL_TOPICS;

  function handleSelect(label: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (label === ALL_TOPICS) {
      params.delete('topic');
    } else {
      params.set('topic', label);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const filtered =
    posts && activeTopic !== ALL_TOPICS ? posts.filter((p) => p.category === activeTopic) : posts;

  return (
    <>
      <CategoryFilter active={activeTopic} onSelect={handleSelect} />
      {isLoading || !filtered ? (
        <PostFeedSkeleton />
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">No posts in this topic yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  );
}
