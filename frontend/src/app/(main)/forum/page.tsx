'use client';

import { useState } from 'react';
import PostCard from '@/app/_components/PostCard';
import { usePosts } from '@/hooks/usePosts';
import CategoryFilter from './_components/CategoryFilter';
import PostFeedSkeleton from './_components/PostFeedSkeleton';

const ALL_LABEL = 'All';

export default function ForumPage() {
  const [activeCategory, setActiveCategory] = useState(ALL_LABEL);
  const { data: posts, isLoading } = usePosts();

  const filtered =
    posts && activeCategory !== ALL_LABEL
      ? posts.filter((p) => p.category === activeCategory)
      : posts;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-gray-50 font-bold text-2xl">Forum</h1>
      <CategoryFilter active={activeCategory} onSelect={setActiveCategory} />
      {isLoading || !filtered ? (
        <PostFeedSkeleton />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
