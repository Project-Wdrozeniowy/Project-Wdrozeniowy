import { useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AuthorOpeningsTrend from '@/pages/post/ui/AuthorOpeningsTrend';
import { collectionDate, insightsError, insightsNumber } from '@/pages/post/lib/postInsights';
import {
  DEFAULT_ANALYTICS_PERIOD,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import { usePostEngagement } from '@/shared/api/analytics/usePostEngagement';
import { usePostOpenings } from '@/shared/api/analytics/usePostOpenings';
import { apiErrorStatus } from '@/shared/api/client/apiError';
import { getGetPostQueryKey } from '@/shared/api/generated/orbita.api';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import { useCurrentUser } from '@/shared/api/profile/currentUser';
import { ChartBarIcon, ChevronRightIcon, EyeIcon } from '@/shared/ui/icons';
import PanelError from '@/shared/ui/PanelError';
import SkeletonStatus from '@/shared/ui/SkeletonStatus';

interface PostInsightsProps {
  post: PostDto;
  onRefreshPost: () => Promise<{ isError: boolean }>;
}

const controlClass =
  'rounded px-3 py-2 text-sm font-semibold text-fg hover:bg-raised aria-disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** The identity key also discards local expansion/error state and detaches old query observers. */
export default function PostInsights({ post, onRefreshPost }: PostInsightsProps) {
  const currentUser = useCurrentUser();
  const accountId = currentUser?.id === post.author.id ? currentUser.id : undefined;
  if (post.status === 'DELETED') return null;
  if (accountId === undefined && !['PUBLISHED', 'LOCKED'].includes(post.status)) return null;
  return (
    <InsightsCard
      key={`${post.id}:${accountId ?? 'public'}`}
      post={post}
      accountId={accountId}
      onRefreshPost={onRefreshPost}
    />
  );
}

interface InsightsCardProps extends PostInsightsProps {
  accountId?: number;
}

function InsightsCard({ post, accountId, onRefreshPost }: InsightsCardProps) {
  const query = usePostEngagement(post.id, accountId);
  const [period, setPeriod] = useState<AnalyticsPeriod>(DEFAULT_ANALYTICS_PERIOD);
  const trend = usePostOpenings(post.id, accountId, period);
  const client = useQueryClient();
  const titleId = useId();
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [postFailed, setPostFailed] = useState(false);
  const [retryingFailure, setRetryingFailure] = useState(false);
  const inFlight = useRef(false);
  const restoreFocus = useRef(false);
  const section = useRef<HTMLElement>(null);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const failed = query.isError || postFailed || retryingFailure;
  const owner = accountId !== undefined;

  // A summary may discover withdrawal/deletion before the article does. Never keep its old totals.
  const status = apiErrorStatus(query.error);
  useEffect(() => {
    if (status === 404 && !query.isFetching) {
      void client.invalidateQueries({ queryKey: getGetPostQueryKey(post.slug) });
    }
  }, [client, post.slug, status, query.errorUpdatedAt, query.isFetching]);

  useEffect(() => {
    if (!refreshing && !failed && restoreFocus.current) {
      restoreFocus.current = false;
      // Do not steal focus if the reader moved away while the request was in flight.
      if (
        document.activeElement === document.body ||
        section.current?.contains(document.activeElement)
      ) {
        (expandButton.current ?? refreshButton.current)?.focus();
      }
    }
  }, [refreshing, failed]);

  async function refresh() {
    if (inFlight.current || query.isLoading) return;
    inFlight.current = true;
    const recovering = failed;
    setRetryingFailure(recovering);
    setRefreshing(true);
    try {
      // The daily openings answer for themselves (their own error and retry): a failed read of
      // them must not turn the totals into a failure.
      const [summary, article] = await Promise.all([
        query.refetch(),
        onRefreshPost(),
        owner ? trend.refetch() : undefined,
      ]);
      setPostFailed(article.isError);
      restoreFocus.current =
        recovering &&
        !summary.isError &&
        !article.isError &&
        Boolean(section.current?.contains(document.activeElement));
    } finally {
      inFlight.current = false;
      setRetryingFailure(false);
      setRefreshing(false);
    }
  }

  const data = query.data;
  const busy = refreshing || query.isFetching;
  const showOpenings = owner || expanded;
  return (
    <section
      ref={section}
      aria-labelledby={titleId}
      className="bg-surface rounded-xl border border-line overflow-hidden"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-accent">
              <ChartBarIcon />
            </span>
            <h2 id={titleId} className="font-semibold text-fg">
              {owner ? 'Author insights' : 'Post insights'}
            </h2>
            <span className="rounded border border-line px-2 py-0.5 text-xs font-medium text-fg-muted">
              {owner ? 'Author only' : 'Public'}
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            {owner ? 'Visible only to the post author' : 'Public summary'} · dates shown in UTC
          </p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {!owner && !failed && !query.isLoading && data && (
            <button
              ref={expandButton}
              type="button"
              aria-expanded={expanded}
              aria-controls={detailsId}
              className={controlClass}
              onClick={() => setExpanded((value) => !value)}
            >
              <span className="flex items-center gap-1">
                {expanded ? 'Hide details' : 'Details'}
                <span className={expanded ? '-rotate-90' : 'rotate-90'}>
                  <ChevronRightIcon />
                </span>
              </span>
            </button>
          )}
          <button
            ref={refreshButton}
            type="button"
            aria-disabled={busy || undefined}
            className={controlClass}
            onClick={() => {
              if (!busy) void refresh();
            }}
          >
            Refresh insights
          </button>
        </div>
      </div>
      <p role="status" className="sr-only">
        {busy && !query.isLoading && !failed ? 'Updating post insights…' : ''}
      </p>
      <div className="p-4 sm:p-5">
        {failed ? (
          <PanelError
            message={
              query.isError
                ? insightsError(query.error)
                : postFailed
                  ? 'The post could not be refreshed. Please try again.'
                  : 'Insights could not be loaded. Please try again.'
            }
            onRetry={refresh}
            retrying={refreshing}
          />
        ) : query.isLoading ? (
          <SkeletonStatus label="Loading post insights">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 animate-pulse">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-3">
                  <div className="h-3 w-20 rounded bg-raised" />
                  <div className="h-6 w-14 rounded bg-raised" />
                </div>
              ))}
            </div>
          </SkeletonStatus>
        ) : data ? (
          <>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
              <div>
                <dt className="text-xs text-fg-muted">Score</dt>
                <dd className="mt-1 text-lg font-semibold text-fg tabular-nums">
                  {insightsNumber(data.voteScore)}
                </dd>
                {owner && 'upvoteCount' in data && (
                  <dd className="mt-1 text-xs text-fg-muted">
                    {insightsNumber(data.upvoteCount)}{' '}
                    {data.upvoteCount === 1 ? 'upvote' : 'upvotes'} ·{' '}
                    {insightsNumber(data.downvoteCount)}{' '}
                    {data.downvoteCount === 1 ? 'downvote' : 'downvotes'}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-fg-muted">Visible comments</dt>
                <dd className="mt-1 text-lg font-semibold text-fg tabular-nums">
                  {insightsNumber(data.commentCount)}
                </dd>
                <dd className="mt-1 text-xs text-fg-muted">Includes replies</dd>
              </div>
              <div id={detailsId} hidden={!showOpenings} className="col-span-2 sm:col-span-1">
                <dt className="flex items-center gap-1 text-xs text-fg-muted">
                  <EyeIcon /> Openings
                </dt>
                <dd className="mt-1 text-lg font-semibold text-fg tabular-nums">
                  {insightsNumber(data.viewCount)}
                </dd>
                <dd className="mt-1 text-xs text-fg-muted">
                  since{' '}
                  <time dateTime={data.collectedFrom}>
                    {collectionDate(data.collectedFrom)} · UTC
                  </time>
                </dd>
              </div>
            </dl>
            {showOpenings && (
              <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-fg-muted">
                Openings are counted since {collectionDate(data.collectedFrom)} UTC. They are not
                unique readers.
              </p>
            )}
            {owner && (
              <div className="mt-4 border-t border-line pt-4">
                <AuthorOpeningsTrend trend={trend} period={period} onPeriodChange={setPeriod} />
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
