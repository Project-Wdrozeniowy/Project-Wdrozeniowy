import type { CategoryRow } from '@/pages/dashboard/lib/dashboardView';
import { getCategoryDotColor } from '@/shared/lib/categoryColor';
import { cn } from '@/shared/lib/cn';
import { Link } from 'react-router';

interface CategoryDistributionChartProps {
  rows: CategoryRow[];
  title: string;
  destinations: Record<string, { href: string; label: string }>;
}

/** Figma's horizontal count bars. Full names/counts remain readable above even the smallest bar. */
export default function CategoryDistributionChart({
  rows,
  title,
  destinations,
}: CategoryDistributionChartProps) {
  return (
    <div
      role="group"
      aria-label={`${title}. ${rows.map((row) => `${row.label}: ${row.posts}`).join(', ')}`}
    >
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <Link
            key={row.key}
            to={destinations[row.key].href}
            aria-label={destinations[row.key].label}
            className="block min-w-0 rounded-md hover:underline focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <div className="flex items-start justify-between gap-3 text-sm mb-1.5">
              <span className="min-w-0 wrap-anywhere font-medium">{row.label}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {row.posts.toLocaleString('en-US')}
              </span>
            </div>
            <div aria-hidden="true" className="h-8 rounded-md bg-raised">
              <div
                data-testid="category-bar"
                className={cn(
                  'relative h-8 rounded-md overflow-hidden',
                  row.category ? getCategoryDotColor(row.category) : 'bg-fg-subtle'
                )}
                style={{ width: `${row.barPercent}%` }}
              >
                <span className="absolute right-2 top-2 text-xs font-semibold text-surface whitespace-nowrap">
                  {row.posts.toLocaleString('en-US')}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
