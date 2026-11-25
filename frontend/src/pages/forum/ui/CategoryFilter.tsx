import { ALL_TOPICS, CATEGORIES } from '@/shared/constants/categories.const';
import { cn } from '@/shared/lib/cn';

interface CategoryFilterProps {
  active: string | null;
  onSelect: (label: string) => void;
}

export default function CategoryFilter({ active, onSelect }: CategoryFilterProps) {
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
            active === label ? 'bg-blue-600 text-white' : 'bg-surface text-fg hover:bg-raised'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
