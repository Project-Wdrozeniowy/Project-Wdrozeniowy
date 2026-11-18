import { CHART_COLORS, NO_ACTIVITY_TEXT } from '@/pages/dashboard/config/dashboard.const';
import {
  activitySeries,
  categorySeries,
  chartSummary,
  isEmptySeries,
} from '@/pages/dashboard/lib/dashboardView';
import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import { usePublicActivity } from '@/shared/api/analytics/usePublicActivity';
import { usePublicCategoryDistribution } from '@/shared/api/analytics/usePublicCategoryDistribution';
import QueryState from '@/shared/ui/QueryState';
import BarChart from './BarChart';
import ChartCard from './ChartCard';
import ChartSkeleton from './ChartSkeleton';
import LineChart from './LineChart';

interface ChartsSectionProps {
  period: AnalyticsPeriod;
}

export default function ChartsSection({ period }: ChartsSectionProps) {
  const activity = usePublicActivity(period);
  const categories = usePublicCategoryDistribution(period);
  const when = ANALYTICS_PERIOD_LABELS[period].toLowerCase();
  const series = activity.data ? activitySeries(activity.data) : null;
  const byCategory = categories.data ? categorySeries(categories.data) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Posts per day">
        <QueryState
          query={activity}
          skeleton={<ChartSkeleton />}
          empty={!series || isEmptySeries(series.posts)}
          emptyText={NO_ACTIVITY_TEXT}
        >
          {series && (
            <LineChart
              data={series.posts}
              labels={series.labels}
              color={CHART_COLORS.posts}
              summary={chartSummary(`Posts per day, ${when}`, series.days, series.posts)}
            />
          )}
        </QueryState>
      </ChartCard>
      <ChartCard title="Comments per day">
        <QueryState
          query={activity}
          skeleton={<ChartSkeleton />}
          empty={!series || isEmptySeries(series.comments)}
          emptyText={NO_ACTIVITY_TEXT}
        >
          {series && (
            <LineChart
              data={series.comments}
              labels={series.labels}
              color={CHART_COLORS.comments}
              summary={chartSummary(`Comments per day, ${when}`, series.days, series.comments)}
            />
          )}
        </QueryState>
      </ChartCard>
      <ChartCard title="Posts by category" wide>
        <QueryState
          query={categories}
          skeleton={<ChartSkeleton />}
          empty={!byCategory || byCategory.values.length === 0}
          emptyText={NO_ACTIVITY_TEXT}
        >
          {byCategory && (
            <BarChart
              data={byCategory.values}
              labels={byCategory.labels}
              color={CHART_COLORS.categories}
              summary={chartSummary(
                `Posts by category, ${when}`,
                byCategory.labels,
                byCategory.values
              )}
            />
          )}
        </QueryState>
      </ChartCard>
    </div>
  );
}
