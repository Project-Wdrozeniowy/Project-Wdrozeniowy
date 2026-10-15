'use client';

import { useState } from 'react';
import { CreatePostButton } from '@/features/create-post/CreatePostButton';
import PostCardSkeleton from './_ui/PostCardSkeleton';
import PostCard from './_ui/PostCard';
import { usePosts } from '@/shared/api/forum/usePosts';
import { cn } from '@/shared/lib/cn';

const SORT_TABS = ['Hot', 'New', 'Top'] as const;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(0);
  const { data: posts, isLoading } = usePosts();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center bg-slate-700 rounded-xl p-1 gap-1">
          {SORT_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                'px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors',
                i === activeTab ? 'bg-white text-gray-900' : 'text-gray-50 hover:bg-slate-600'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <CreatePostButton />
      </div>

      <div className="flex flex-col gap-3">
        {isLoading || !posts
          ? Array.from({ length: 5 }).map((_, i) => <PostCardSkeleton key={i} />)
          : posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  );
}
