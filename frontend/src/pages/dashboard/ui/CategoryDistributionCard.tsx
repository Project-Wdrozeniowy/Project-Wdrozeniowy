import { useId, useState } from 'react';
import {
  CATEGORY_CHART_TITLE,
  NO_CATEGORY_POSTS_TEXT,
} from '@/pages/dashboard/config/dashboard.const';
import { categorySeries } from '@/pages/dashboard/lib/dashboardView';
import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import { usePublicCategoryDistribution } from '@/shared/api/analytics/usePublicCategoryDistribution';
import QueryState from '@/shared/ui/QueryState';
import PanelError from '@/shared/ui/PanelError';
import CategoryDistributionChart from './CategoryDistributionChart';
import CategoryDistributionTable from './CategoryDistributionTable';
import ChartCard from './ChartCard';
import ChartSkeleton from './ChartSkeleton';

const dayFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const readTimeFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

interface CategoryDistributionCardProps {
  period: AnalyticsPeriod;
}

/** The API response owns both presentations, their total and their timestamp. Actions: PWDRZ-185. */
export default function CategoryDistributionCard({ period }: CategoryDistributionCardProps) {
  const query = usePublicCategoryDistribution(period);
  const data = query.data;
  const rows = data ? categorySeries(data) : [];
  const tableId = useId();
  const [tableOpen, setTableOpen] = useState(false);
  const label = data ? ANALYTICS_PERIOD_LABELS[data.period] : ANALYTICS_PERIOD_LABELS[period];
  const title = `${CATEGORY_CHART_TITLE}, ${label}, UTC`;

  return (
    <ChartCard title={CATEGORY_CHART_TITLE}>
      <QueryState query={query} skeleton={<ChartSkeleton />}>
        {data && (
          <>
            <div className="text-sm text-fg-subtle space-y-1">
              <p className="font-medium text-fg">{label}</p>
              <p>
                {data.totalPosts.toLocaleString('en-US')} public{' '}
                {data.totalPosts === 1 ? 'post' : 'posts'}
              </p>
              <p>
                {dayFormat.format(new Date(data.windowStart))} –{' '}
                {dayFormat.format(new Date(data.windowEnd))} (end exclusive), UTC
              </p>
              <p>
                Updated{' '}
                <time dateTime={data.generatedAt}>
                  {readTimeFormat.format(new Date(data.generatedAt))} UTC
                </time>
                . Counts for today may grow.
              </p>
            </div>
            <p role="status" className="text-xs text-fg-subtle" aria-live="polite">
              {query.isFetching && !query.isRefetchError ? 'Updating categories…' : ''}
            </p>
            {query.isRefetchError && (
              <PanelError
                message="Could not update categories. Showing the last loaded data."
                retrying={query.isFetching}
                onRetry={() => query.refetch()}
              />
            )}
            {data.totalPosts === 0 && (
              <p className="text-sm text-fg-subtle">{NO_CATEGORY_POSTS_TEXT}</p>
            )}
            <CategoryDistributionChart rows={rows} title={title} />
            <p className="text-xs text-fg-subtle">
              Share is of all public posts in this window. Rounded percentages may not add up to
              100%.
            </p>
            <button
              type="button"
              aria-expanded={tableOpen}
              aria-controls={tableId}
              onClick={() => setTableOpen((open) => !open)}
              className="self-start rounded border border-line-strong px-3 py-1.5 text-sm font-semibold text-fg hover:bg-raised focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              Category data table
            </button>
            <div id={tableId} hidden={!tableOpen}>
              <CategoryDistributionTable rows={rows} title={title} />
            </div>
          </>
        )}
      </QueryState>
    </ChartCard>
  );
}
