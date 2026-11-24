import { useState } from 'react';
import {
  ACTIVITY_CHART_DESCRIPTION,
  ACTIVITY_CHART_TITLE,
  CHART_COLORS,
  NO_ACTIVITY_TEXT,
} from '@/pages/dashboard/config/dashboard.const';
import { activityMetrics, categorySeries, chartSummary } from '@/pages/dashboard/lib/dashboardView';
import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import { usePublicActivity } from '@/shared/api/analytics/usePublicActivity';
import { usePublicCategoryDistribution } from '@/shared/api/analytics/usePublicCategoryDistribution';
import { getLoadPhase } from '@/shared/lib/loadPhase';
import QueryState from '@/shared/ui/QueryState';
import { ActivityChart } from '@/widgets/activity-chart';
import BarChart from './BarChart';
import ChartCard from './ChartCard';
import ChartSkeleton from './ChartSkeleton';

interface ChartsSectionProps {
  period: AnalyticsPeriod;
}

export default function ChartsSection({ period }: ChartsSectionProps) {
  const activity = usePublicActivity(period);
  const categories = usePublicCategoryDistribution(period);
  const [metricId, setMetricId] = useState('posts');
  const when = ANALYTICS_PERIOD_LABELS[period].toLowerCase();
  const byCategory = categories.data ? categorySeries(categories.data) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ActivityChart
        title={ACTIVITY_CHART_TITLE}
        description={ACTIVITY_CHART_DESCRIPTION}
        metrics={activityMetrics(activity.data)}
        metricId={metricId}
        onMetricChange={setMetricId}
        periodLabel={ANALYTICS_PERIOD_LABELS[period]}
        phase={getLoadPhase(activity)}
        onRetry={() => activity.refetch()}
        emptyText={NO_ACTIVITY_TEXT}
      />
      <ChartCard title="Posts by category">
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
