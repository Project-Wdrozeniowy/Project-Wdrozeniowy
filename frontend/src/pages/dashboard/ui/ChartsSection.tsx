import { dayPublicationsHref } from '@/features/publication-drilldown';
import {
  ACTIVITY_CHART_DESCRIPTION,
  ACTIVITY_CHART_TITLE,
  NO_ACTIVITY_TEXT,
} from '@/pages/dashboard/config/dashboard.const';
import { activityMetrics, countLabel } from '@/pages/dashboard/lib/dashboardView';
import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import { usePublicActivity } from '@/shared/api/analytics/usePublicActivity';
import { getLoadPhase } from '@/shared/lib/loadPhase';
import { ActivityChart } from '@/widgets/activity-chart';
import CategoryDistributionCard from './CategoryDistributionCard';
import RefreshFailedNotice from './RefreshFailedNotice';
import WindowMeta from './WindowMeta';

interface ChartsSectionProps {
  period: AnalyticsPeriod;
  metricId: string;
  onMetricChange: (metric: string) => void;
  activityTableOpen: boolean;
  onActivityTableOpenChange: (open: boolean) => void;
  categoryTableOpen: boolean;
  onCategoryTableOpenChange: (open: boolean) => void;
}

export default function ChartsSection({
  period,
  metricId,
  onMetricChange,
  activityTableOpen,
  onActivityTableOpenChange,
  categoryTableOpen,
  onCategoryTableOpenChange,
}: ChartsSectionProps) {
  const activity = usePublicActivity(period);
  const data = activity.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4 min-w-0">
      <ActivityChart
        title={ACTIVITY_CHART_TITLE}
        description={ACTIVITY_CHART_DESCRIPTION}
        metrics={activityMetrics(data)}
        kind="bar"
        metricId={metricId}
        onMetricChange={onMetricChange}
        tableOpen={activityTableOpen}
        onTableOpenChange={onActivityTableOpenChange}
        pointLinks={
          metricId === 'posts' && data
            ? Object.fromEntries(
                data.days.map((day) => [
                  day.date,
                  {
                    href: dayPublicationsHref(day.date),
                    label: `Open ${countLabel(day.posts, 'post', 'posts')} on ${new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}, UTC`,
                  },
                ])
              )
            : undefined
        }
        periodLabel={ANALYTICS_PERIOD_LABELS[period]}
        phase={getLoadPhase(activity)}
        onRetry={() => activity.refetch()}
        emptyText={NO_ACTIVITY_TEXT}
        meta={
          data && (
            <>
              <p className="font-medium text-fg">
                {countLabel(data.totalPosts, 'public post', 'public posts')} and{' '}
                {countLabel(data.totalComments, 'comment', 'comments')} in this window
              </p>
              <WindowMeta
                windowStart={data.windowStart}
                windowEnd={data.windowEnd}
                generatedAt={data.generatedAt}
              />
              {activity.isRefetchError && (
                <RefreshFailedNotice
                  what="the activity chart"
                  retrying={activity.isFetching}
                  onRetry={() => activity.refetch()}
                />
              )}
            </>
          )
        }
      />
      <CategoryDistributionCard
        period={period}
        tableOpen={categoryTableOpen}
        onTableOpenChange={onCategoryTableOpenChange}
      />
    </div>
  );
}
