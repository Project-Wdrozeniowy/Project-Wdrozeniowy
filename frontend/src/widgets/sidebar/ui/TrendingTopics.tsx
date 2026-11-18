import { Link } from 'react-router';
import { usePublicCategoryDistribution } from '@/shared/api/analytics/usePublicCategoryDistribution';
import { cn } from '@/shared/lib/cn';
import { ChevronRightIcon } from '@/shared/ui/icons';
import QueryState from '@/shared/ui/QueryState';
import { getCategoryColor, getCategoryTopic } from '@/shared/lib/categoryColor';
import {
  NO_TOPICS_TEXT,
  SIDEBAR_PERIOD,
  SIDEBAR_PERIOD_LABEL,
  TRENDING_TOPICS_LIMIT,
  TRENDING_TOPICS_TITLE,
} from './sidebar.const';

function TopicsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading trending topics"
      aria-busy="true"
      className="flex flex-col gap-2"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-8 bg-raised rounded animate-pulse" />
      ))}
    </div>
  );
}

/** The categories with the most public posts of the last seven days. */
export default function TrendingTopics() {
  const query = usePublicCategoryDistribution(SIDEBAR_PERIOD);
  // Posts without a category are the last row of the data and are not a topic to browse.
  const topics = (query.data?.categories ?? [])
    .filter((row) => row.category !== null && row.posts > 0)
    .slice(0, TRENDING_TOPICS_LIMIT);

  return (
    <section
      aria-label={TRENDING_TOPICS_TITLE}
      className="bg-surface rounded-xl p-4 flex flex-col gap-4 border border-line"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-fg font-semibold text-xl leading-none">{TRENDING_TOPICS_TITLE}</h2>
        <p className="text-fg-subtle text-xs">{SIDEBAR_PERIOD_LABEL}</p>
      </div>
      <QueryState
        query={query}
        skeleton={<TopicsSkeleton />}
        empty={topics.length === 0}
        emptyText={NO_TOPICS_TEXT}
      >
        <ol className="flex flex-col gap-0.5">
          {topics.map(({ category, posts }, index) => {
            const name = category?.name ?? '';
            // The feed filters by the known topic labels (found by slug first, so a renamed category
            // still filters); another category opens the whole forum.
            const topic = getCategoryTopic({ name, slug: category?.slug });
            const href = topic ? `/forum?${new URLSearchParams({ topic }).toString()}` : '/forum';
            return (
              <li key={category?.id ?? name}>
                <Link to={href} className="flex items-center justify-between py-2 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-fg-subtle font-bold text-xl w-4 text-center">
                      {index + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'w-3 h-3 rounded-full shrink-0 border bg-current',
                        getCategoryColor({ name, slug: category?.slug })
                      )}
                    />
                    <span className="text-fg text-sm truncate group-hover:text-accent transition-colors">
                      {name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-fg-subtle text-xs">
                      {posts.toLocaleString('en-US')} {posts === 1 ? 'post' : 'posts'}
                    </span>
                    <ChevronRightIcon />
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </QueryState>
    </section>
  );
}
