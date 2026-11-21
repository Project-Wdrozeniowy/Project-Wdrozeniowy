import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import { useStore } from '@/store';
import { useMyActivitySummary } from '@/shared/api/analytics/useMyActivitySummary';
import { usePublicActivityComparison } from '@/shared/api/analytics/usePublicActivityComparison';
import StatCard from './StatCard';

interface StatsSectionProps {
  period: AnalyticsPeriod;
}

/**
 * Two public figures of the window with their change, and, for a signed-in user, two of their own.
 */
export default function StatsSection({ period }: StatsSectionProps) {
  const comparison = usePublicActivityComparison(period);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const mine = useMyActivitySummary();
  const caption = ANALYTICS_PERIOD_LABELS[period];
  // A failed refresh keeps the last figures (isLoadingError), and a query that is not enabled is not
  // "loading" (isLoading), so a figure never shows a skeleton for ever.
  const publicState = { isPending: comparison.isPending, isError: comparison.isLoadingError };
  const mineState = { isPending: mine.isLoading, isError: mine.isLoadingError };

  return (
    <section aria-label="Key figures" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatCard
        label="Posts"
        caption={caption}
        value={comparison.data?.posts.current}
        change={comparison.data?.posts.changePercent ?? null}
        {...publicState}
      />
      <StatCard
        label="Comments"
        caption={caption}
        value={comparison.data?.comments.current}
        change={comparison.data?.comments.changePercent ?? null}
        {...publicState}
      />
      {/* The user's own totals need a session: a guest sees the public figures only. */}
      {isAuthenticated && (
        <>
          <StatCard
            label="Your posts"
            caption="All time"
            value={mine.data?.totalPosts}
            {...mineState}
          />
          <StatCard
            label="Upvotes you received"
            caption="All time"
            value={mine.data?.totalUpvotesReceived}
            {...mineState}
          />
        </>
      )}
    </section>
  );
}
