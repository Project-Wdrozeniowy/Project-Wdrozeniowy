'use client';

import { ALL_TOPICS, CATEGORIES } from '@/constants/categories';
import { cn } from '@/lib/cn';

interface Props {
  active: string;
  onSelect: (label: string) => void;
}

export default function CategoryFilter({ active, onSelect }: Props) {
  const labels = [ALL_TOPICS, ...CATEGORIES.map((c) => c.label)];

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <button
          key={label}
          type="button"
          aria-pressed={active === label}
          onClick={() => onSelect(label)}
          className={cn(
            'px-3 py-1.5 rounded text-sm font-semibold transition-colors',
            active === label
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-gray-50 hover:bg-slate-700'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
