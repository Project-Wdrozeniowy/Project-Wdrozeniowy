'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

const TABS = ['Posts', 'Comments', 'Saved', 'Activity'] as const;
type Tab = (typeof TABS)[number];

export default function ProfileTabs() {
  const [active, setActive] = useState<Tab>('Posts');

  return (
    <div className="bg-gray-100 rounded-xl p-1 flex gap-1 self-start">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActive(tab)}
          className={cn(
            'px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors',
            active === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
