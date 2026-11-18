import { NO_TOP_POSTS_TEXT } from '@/pages/dashboard/config/dashboard.const';
import { TOP_POSTS_LIMIT, type AnalyticsPeriod } from '@/shared/api/analytics/analytics.const';
import { useTrendingPosts } from '@/shared/api/analytics/useTrendingPosts';
import QueryState from '@/shared/ui/QueryState';
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

/** The most active posts of the window, ranked by the server (views, votes and comments). */
export default function TopPostsCard({ period }: TopPostsCardProps) {
  const query = useTrendingPosts(period);

  return (
    <section
      aria-label="Top posts"
      className="bg-surface rounded-xl p-5 flex flex-col gap-4 border border-line"
    >
      <h2 className="text-fg font-semibold text-xl">Most active posts</h2>
      <QueryState
        query={query}
        skeleton={<TopPostsSkeleton />}
        empty={(query.data?.length ?? 0) === 0}
        emptyText={NO_TOP_POSTS_TEXT}
      >
        <ol className="flex flex-col gap-2">
          {query.data?.map((post, index) => (
            <TopPostRow key={post.id} rank={index + 1} post={post} />
          ))}
        </ol>
      </QueryState>
    </section>
  );
}
