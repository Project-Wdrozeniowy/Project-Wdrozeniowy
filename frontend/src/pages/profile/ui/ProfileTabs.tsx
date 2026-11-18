import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

const TABS = ['Posts', 'Comments', 'Saved', 'Activity'] as const;
type Tab = (typeof TABS)[number];

export default function ProfileTabs() {
  const [active, setActive] = useState<Tab>('Posts');

  return (
    <div className="bg-raised rounded-xl p-1 flex gap-1 self-start">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActive(tab)}
          className={cn(
            'px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors',
            active === tab ? 'bg-surface text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
