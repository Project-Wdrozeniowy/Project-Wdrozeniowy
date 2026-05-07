'use client';

import { useState } from 'react';
import { CATEGORIES } from '@/constants/categories';

const ALL_LABEL = 'All';

export default function CategoryFilter() {
  const [active, setActive] = useState(ALL_LABEL);

  const labels = [ALL_LABEL, ...CATEGORIES.map((c) => c.label)];

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <button
          key={label}
          onClick={() => setActive(label)}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            active === label
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-gray-50 hover:bg-slate-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
