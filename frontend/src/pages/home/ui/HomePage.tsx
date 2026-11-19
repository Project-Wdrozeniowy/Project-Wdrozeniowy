import { useState } from 'react';
import { CreatePostButton } from '@/features/create-post/CreatePostButton';
import HomeFeed from './HomeFeed';
import { cn } from '@/shared/lib/cn';

const SORT_TABS = ['Hot', 'New', 'Top'] as const;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-raised rounded-xl p-1 gap-1">
          {SORT_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                'px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors',
                i === activeTab ? 'bg-surface text-fg' : 'text-fg hover:bg-raised-hover'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <CreatePostButton />
      </div>

      <HomeFeed />
    </div>
  );
}
