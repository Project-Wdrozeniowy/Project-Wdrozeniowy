import { useId, useState } from 'react';
import {
  CATEGORY_CHART_TITLE,
  NO_CATEGORY_POSTS_TEXT,
} from '@/pages/dashboard/config/dashboard.const';
import { categorySeries, countLabel } from '@/pages/dashboard/lib/dashboardView';
import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import { usePublicCategoryDistribution } from '@/shared/api/analytics/usePublicCategoryDistribution';
import QueryState from '@/shared/ui/QueryState';
import RefreshFailedNotice from './RefreshFailedNotice';
import WindowMeta from './WindowMeta';
import CategoryDistributionChart from './CategoryDistributionChart';
import CategoryDistributionTable from './CategoryDistributionTable';
import ChartCard from './ChartCard';
import ChartSkeleton from './ChartSkeleton';
import { categoryPublicationsHref } from '@/features/publication-drilldown';

interface CategoryDistributionCardProps {
  period: AnalyticsPeriod;
  tableOpen?: boolean;
  onTableOpenChange?: (open: boolean) => void;
}

/** The displayed response owns the count, identity and exact window of every destination. */
export default function CategoryDistributionCard({
  period,
  tableOpen: controlledTableOpen,
  onTableOpenChange,
}: CategoryDistributionCardProps) {
  const query = usePublicCategoryDistribution(period);
  const data = query.data;
  const rows = data ? categorySeries(data) : [];
  const tableId = useId();
  const [localTableOpen, setLocalTableOpen] = useState(false);
  const tableOpen = controlledTableOpen ?? localTableOpen;
  const destinations = data
    ? Object.fromEntries(
        rows.map((row) => [
          row.key,
          {
            href: categoryPublicationsHref(data, row.category),
            label: `Open ${countLabel(row.posts, 'post', 'posts')} in ${row.label}, ${ANALYTICS_PERIOD_LABELS[data.period]}, UTC`,
          },
        ])
      )
    : {};
  const label = data ? ANALYTICS_PERIOD_LABELS[data.period] : ANALYTICS_PERIOD_LABELS[period];
  const title = `${CATEGORY_CHART_TITLE}, ${label}, UTC`;

  return (
    <ChartCard title={CATEGORY_CHART_TITLE}>
      <QueryState query={query} skeleton={<ChartSkeleton />}>
        {data && (
          <>
            <div className="text-sm text-fg-subtle space-y-1">
              <p className="font-medium text-fg">{label}</p>
              <p>{countLabel(data.totalPosts, 'public post', 'public posts')}</p>
              <WindowMeta
                windowStart={data.windowStart}
                windowEnd={data.windowEnd}
                generatedAt={data.generatedAt}
              />
            </div>
            <p role="status" className="text-xs text-fg-subtle" aria-live="polite">
              {query.isFetching && !query.isRefetchError ? 'Updating categories…' : ''}
            </p>
            {query.isRefetchError && (
              <RefreshFailedNotice
                what="categories"
                retrying={query.isFetching}
                onRetry={() => query.refetch()}
              />
            )}
            {data.totalPosts === 0 && (
              <p className="text-sm text-fg-subtle">{NO_CATEGORY_POSTS_TEXT}</p>
            )}
            <CategoryDistributionChart rows={rows} title={title} destinations={destinations} />
            <p className="text-xs text-fg-subtle">
              Share is of all public posts in this window. Rounded percentages may not add up to
              100%.
            </p>
            <button
              type="button"
              aria-expanded={tableOpen}
              aria-controls={tableId}
              onClick={() =>
                onTableOpenChange ? onTableOpenChange(!tableOpen) : setLocalTableOpen(!tableOpen)
              }
              className="self-start rounded border border-line-strong px-3 py-1.5 text-sm font-semibold text-fg hover:bg-raised focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              Category data table
            </button>
            <div id={tableId} hidden={!tableOpen}>
              <CategoryDistributionTable rows={rows} title={title} destinations={destinations} />
            </div>
          </>
        )}
      </QueryState>
    </ChartCard>
  );
}
