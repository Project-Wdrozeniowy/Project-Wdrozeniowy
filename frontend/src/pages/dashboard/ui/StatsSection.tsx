import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import { CommentIcon, PostIcon } from '@/shared/ui/icons';
import { useStore } from '@/store';
import { usePublicActivityComparison } from '@/shared/api/analytics/usePublicActivityComparison';
import { utcMoment } from '@/pages/dashboard/lib/utcTime';
import OwnStatCards from './OwnStatCards';
import RefreshFailedNotice from './RefreshFailedNotice';
import StatCard from './StatCard';
import UpdatedAt from './UpdatedAt';

interface StatsSectionProps {
  period: AnalyticsPeriod;
}

/**
 * Two public figures of the window with their change, and, for a signed-in user, two of their own.
 */
export default function StatsSection({ period }: StatsSectionProps) {
  const comparison = usePublicActivityComparison(period);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const caption = ANALYTICS_PERIOD_LABELS[period];
  // A failed refresh keeps the last figures (isLoadingError).
  const publicState = { isPending: comparison.isPending, isError: comparison.isLoadingError };

  return (
    <section aria-label="Key figures" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatCard
        label="Posts"
        icon={<PostIcon />}
        caption={caption}
        value={comparison.data?.posts.current}
        change={comparison.data?.posts.changePercent ?? null}
        {...publicState}
      />
      <StatCard
        label="Comments"
        icon={<CommentIcon />}
        caption={caption}
        value={comparison.data?.comments.current}
        change={comparison.data?.comments.changePercent ?? null}
        {...publicState}
      />
      {/* The user's own totals need a session: a guest sees the public figures only. */}
      {isAuthenticated && <OwnStatCards />}
      {(comparison.data || comparison.isRefetchError) && (
        <div className="sm:col-span-2 text-xs text-fg-subtle space-y-1">
          {comparison.data && (
            <p>
              Counted from {utcMoment(comparison.data.current.start)} UTC up to the read time.{' '}
              <UpdatedAt generatedAt={comparison.data.generatedAt} />
            </p>
          )}
          {comparison.isRefetchError && (
            <RefreshFailedNotice
              what="the key figures"
              retrying={comparison.isFetching}
              onRetry={() => comparison.refetch()}
            />
          )}
        </div>
      )}
    </section>
  );
}
