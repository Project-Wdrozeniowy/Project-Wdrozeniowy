import { useId } from 'react';
import {
  NO_TOP_POSTS_TEXT,
  TOP_POSTS_RULES_SUMMARY,
  TOP_POSTS_TITLE,
  TOP_POSTS_TOTALS_NOTE,
} from '@/pages/dashboard/config/dashboard.const';
import { topPostsRules, topPostsSummary } from '@/pages/dashboard/lib/dashboardView';
import { TOP_POSTS_LIMIT, type AnalyticsPeriod } from '@/shared/api/analytics/analytics.const';
import { useTrendingPosts } from '@/shared/api/analytics/useTrendingPosts';
import QueryState from '@/shared/ui/QueryState';
import RefreshFailedNotice from './RefreshFailedNotice';
import TopPostRow from './TopPostRow';

interface TopPostsCardProps {
  period: AnalyticsPeriod;
}

function TopPostsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading top posts"
      aria-busy="true"
      className="flex flex-col gap-2"
    >
      {Array.from({ length: TOP_POSTS_LIMIT }).map((_, i) => (
        <div key={i} className="h-14 bg-raised rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

/**
 * The most active posts of the window, in the order the server ranks them, and how it ranks them.
 * Nothing is drawn that the response does not carry: no score, no read time, no sample post.
 */
export default function TopPostsCard({ period }: TopPostsCardProps) {
  const query = useTrendingPosts(period);
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="bg-surface rounded-xl p-5 flex flex-col gap-4 border border-line"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex flex-col gap-1">
          <h2 id={headingId} className="text-fg font-semibold text-xl">
            {TOP_POSTS_TITLE}
          </h2>
          <p className="text-fg-subtle text-sm">{topPostsSummary(period)}</p>
        </div>
      </div>
      <details className="text-sm text-fg-muted group">
        <summary className="cursor-pointer font-semibold text-fg rounded focus-visible:outline-2 focus-visible:outline-blue-500">
          {TOP_POSTS_RULES_SUMMARY}
        </summary>
        <ul className="mt-2 list-disc pl-5 flex flex-col gap-1">
          {topPostsRules().map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </details>
      {query.isRefetchError && (
        <RefreshFailedNotice
          what="the top posts"
          retrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      )}
      <QueryState
        query={query}
        skeleton={<TopPostsSkeleton />}
        empty={(query.data?.length ?? 0) === 0}
        emptyText={NO_TOP_POSTS_TEXT}
      >
        <ol aria-label="Most active posts, ranked" className="flex flex-col gap-2">
          {query.data?.map((post, index) => (
            <TopPostRow key={post.id} rank={index + 1} post={post} />
          ))}
        </ol>
        <p className="text-fg-subtle text-xs">{TOP_POSTS_TOTALS_NOTE}</p>
      </QueryState>
    </section>
  );
}
