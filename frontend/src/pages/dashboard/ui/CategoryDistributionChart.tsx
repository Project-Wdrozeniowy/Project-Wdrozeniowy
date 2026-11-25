import type { CategoryRow } from '@/pages/dashboard/lib/dashboardView';
import { getCategoryDotColor } from '@/shared/lib/categoryColor';
import { cn } from '@/shared/lib/cn';

interface CategoryDistributionChartProps {
  rows: CategoryRow[];
  title: string;
}

/** Figma's horizontal count bars. Full names/counts remain readable above even the smallest bar. */
export default function CategoryDistributionChart({ rows, title }: CategoryDistributionChartProps) {
  return (
    <div
      role="img"
      aria-label={`${title}. ${rows.map((row) => `${row.label}: ${row.posts}`).join(', ')}`}
    >
      <div aria-hidden="true" className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key} className="min-w-0">
            <div className="flex items-start justify-between gap-3 text-sm mb-1.5">
              <span className="min-w-0 wrap-anywhere font-medium">{row.label}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {row.posts.toLocaleString('en-US')}
              </span>
            </div>
            <div className="h-8 rounded-md bg-raised">
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
          </div>
        ))}
      </div>
    </div>
  );
}
