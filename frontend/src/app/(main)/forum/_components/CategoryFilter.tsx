'use client';

import { CATEGORIES } from '@/constants/categories';
import { cn } from '@/lib/cn';

const ALL_LABEL = 'All';

interface Props {
  active: string;
  onSelect: (label: string) => void;
}

export default function CategoryFilter({ active, onSelect }: Props) {
  const labels = [ALL_LABEL, ...CATEGORIES.map((c) => c.label)];

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <button
          key={label}
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
