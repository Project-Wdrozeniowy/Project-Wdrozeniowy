import type { UseQueryResult } from '@tanstack/react-query';
import {
  TREND_EMPTY_TEXT,
  TREND_REFRESH_ERROR_TEXT,
  TREND_TITLE,
  TREND_WINDOW_LABEL,
  TREND_WINDOW_OPTIONS,
} from '@/pages/post/config/postInsights.const';
import { missingDaysNote, openingsMetric, trendDescription } from '@/pages/post/lib/openingsTrend';
import { insightsError } from '@/pages/post/lib/postInsights';
import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import type { PostOpeningTrendDto } from '@/shared/api/generated/models/postOpeningTrendDto.dto';
import { getLoadPhase } from '@/shared/lib/loadPhase';
import ChoiceSwitch from '@/shared/ui/ChoiceSwitch';
import { ActivityChart } from '@/widgets/activity-chart';

interface AuthorOpeningsTrendProps {
  /** The owner-only series; the card that mounts this owns the request and its account key. */
  trend: UseQueryResult<PostOpeningTrendDto, unknown>;
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
}

/**
 * The author's daily openings in the post insights card: a bar per UTC day with a table of the
 * same days, a choice of 7 or 30 days, today marked as partial, and a day before collection
 * began shown as "Not measured" rather than as zero. It shows only what the endpoint answered.
 */
export default function AuthorOpeningsTrend({
  trend,
  period,
  onPeriodChange,
}: AuthorOpeningsTrendProps) {
  const data = trend.data;

  return (
    <div className="flex flex-col gap-3">
      <ActivityChart
        embedded
        kind="bar"
        title={TREND_TITLE}
        description={data ? trendDescription(data) : 'UTC · daily openings.'}
        metrics={[openingsMetric(data)]}
        metricId="openings"
        onMetricChange={() => {}}
        periodLabel={ANALYTICS_PERIOD_LABELS[period]}
        phase={getLoadPhase(trend)}
        onRetry={() => trend.refetch()}
        emptyText={TREND_EMPTY_TEXT}
        errorText={insightsError(trend.error)}
        missingNote={data ? missingDaysNote(data) : undefined}
        actions={
          <ChoiceSwitch
            legend={TREND_WINDOW_LABEL}
            options={TREND_WINDOW_OPTIONS}
            value={period}
            onChange={onPeriodChange}
          />
        }
      />
      {trend.isRefetchError && (
        <p role="alert" className="text-sm text-warning">
          {TREND_REFRESH_ERROR_TEXT}
        </p>
      )}
    </div>
  );
}
