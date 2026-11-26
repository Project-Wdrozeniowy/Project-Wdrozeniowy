import { useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AuthorOpeningsTrend from './AuthorOpeningsTrend';
import InsightsIcon from './InsightsIcon';
import { canReadInsights } from '@/pages/post/lib/insightsAccess';
import { compactWindow } from '@/pages/post/lib/insightsChart';
import {
  collectionDate,
  dayRange,
  insightsError,
  insightsNumber,
  utcDay,
} from '@/pages/post/lib/postInsights';
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
import './postInsights.css';

interface PostInsightsProps {
  post: PostDto;
  onRefreshPost: () => Promise<{ isError: boolean }>;
  onUnavailable?: () => void;
}

export default function PostInsights(props: PostInsightsProps) {
  const currentUser = useCurrentUser();
  if (!canReadInsights(props.post, currentUser?.id)) return null;
  return (
    <InsightsCard
      key={`${props.post.id}:${currentUser?.id ?? 'guest'}`}
      {...props}
      accountId={currentUser?.id === props.post.author.id ? currentUser.id : undefined}
    />
  );
}

interface InsightsCardProps extends PostInsightsProps {
  accountId?: number;
}

function InsightsCard({ post, accountId, onRefreshPost, onUnavailable }: InsightsCardProps) {
  const query = usePostEngagement(post.id, accountId);
  const [period, setPeriod] = useState<AnalyticsPeriod>(DEFAULT_ANALYTICS_PERIOD);
  const trend = usePostOpenings(post.id, accountId, period);
  const client = useQueryClient();
  const titleId = useId();
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.('(max-width: 639px)').matches ?? false
  );
  const [refreshing, setRefreshing] = useState(false);
  const [postFailed, setPostFailed] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const expandButton = useRef<HTMLButtonElement>(null);
  const owner = accountId !== undefined;
  const failed = query.isError || (owner && trend.isError) || postFailed || recovering;
  const loading = !failed && (query.isLoading || (owner && trend.isLoading && !expanded));
  const deniedStatus = [query.error, owner ? trend.error : null]
    .map(apiErrorStatus)
    .find((s) => s === 403 || s === 404);

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 639px)');
    if (!media) return;
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (deniedStatus === undefined) return;
    if (deniedStatus === 404)
      void client.invalidateQueries({ queryKey: getGetPostQueryKey(post.slug) });
    onUnavailable?.();
  }, [client, post.slug, deniedStatus, onUnavailable]);

  async function retry() {
    if (inFlight.current) return;
    inFlight.current = true;
    setRecovering(true);
    setRefreshing(true);
    const active = document.activeElement;
    try {
      const [summary, article, series] = await Promise.all([
        query.refetch(),
        onRefreshPost(),
        owner ? trend.refetch() : undefined,
      ]);
      if (!alive.current) return;
      setPostFailed(article.isError);
      const success = !summary.isError && !article.isError && !series?.isError;
      setRecovering(!success);
      if (
        success &&
        (document.activeElement === active || document.activeElement === document.body)
      ) {
        requestAnimationFrame(() => {
          if (
            alive.current &&
            (document.activeElement === active || document.activeElement === document.body)
          )
            expandButton.current?.focus();
        });
      }
    } finally {
      inFlight.current = false;
      if (alive.current) setRefreshing(false);
    }
  }

  const data = query.data;
  const mini = trend.data ? compactWindow(trend.data) : undefined;
  const days = expanded ? trend.data?.days : mini?.days;
  const range = days?.length ? dayRange(days[0].date, days[days.length - 1].date) : undefined;
  const today = new Date();
  const endDay = today.toISOString().slice(0, 10);
  const startDay = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - (period === '7d' ? 6 : 29)
    )
  )
    .toISOString()
    .slice(0, 10);
  const headerRange = range ?? dayRange(startDay, endDay);
  const error = query.error ?? (owner ? trend.error : null);
  const publicZero =
    !owner && data?.viewCount === 0 && data.commentCount === 0 && data.voteScore === 0;
  const showOpenings = owner || expanded;
  const ownerZero =
    owner &&
    expanded &&
    trend.data?.days.some((day) => day.measured) &&
    trend.data.days.every((day) => !day.measured || day.openings === 0);
  const subtitle = owner ? 'Visible only to the post author' : 'Public summary · shown in UTC';
  return (
    <section
      aria-labelledby={titleId}
      className={`post-insights ${owner ? 'insights-author' : 'insights-public'} ${!failed && !loading ? 'insights-ready' : ''}`}
    >
      <header className="insights-header">
        <div className="insights-heading">
          <div className="insights-heading-row">
            <h2 id={titleId}>
              <InsightsIcon name="chart" />
              {owner ? 'Author insights' : 'Post insights'}
            </h2>
            <span className={`insights-badge ${owner ? 'insights-private-badge' : ''}`}>
              {owner && <InsightsIcon name="shield" />}
              {owner ? 'Author only' : 'Public'}
            </span>
          </div>
          <p className="insights-subtitle">
            {owner ? (
              <>
                <span className="insights-desktop">
                  {subtitle} · {headerRange} · UTC
                </span>
                <span className="insights-mobile">
                  {headerRange} · UTC
                  <br />
                  {subtitle}
                </span>
              </>
            ) : (
              subtitle
            )}
          </p>
        </div>
        {!failed && !loading && data && (
          <button
            ref={expandButton}
            type="button"
            aria-label={mobile ? 'Details' : expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className="insights-expand"
            onClick={() => setExpanded((value) => !value)}
          >
            <span className="insights-desktop">{expanded ? 'Collapse' : 'Expand'}</span>
            <span className="insights-mobile">Details</span>
            <InsightsIcon name="chevron" className={expanded ? 'insights-up' : ''} />
          </button>
        )}
      </header>
      <div className="insights-body" aria-busy={loading || refreshing || undefined}>
        {failed ? (
          <div className="insights-notice insights-error" role="alert">
            <InsightsIcon name="alert" />
            <div>
              <h3>Insights could not be loaded</h3>
              <p>
                {apiErrorStatus(error) !== undefined && apiErrorStatus(error)! < 500
                  ? insightsError(error)
                  : postFailed
                    ? 'The post could not be refreshed. Please try again.'
                    : 'The post is still available. Try loading its statistics again.'}
              </p>
              <button
                type="button"
                className="insights-retry"
                aria-disabled={refreshing || undefined}
                onClick={() => {
                  if (!refreshing) void retry();
                }}
              >
                <InsightsIcon name="retry" />
                {refreshing ? 'Trying again…' : 'Try again'}
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="insights-loading" role="status" aria-label="Loading post insights">
            <span className="sr-only">Loading post insights</span>
            <div className="insights-loading-stats">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <span />
                  <span />
                </div>
              ))}
            </div>
            <div className="insights-loading-chart" />
          </div>
        ) : data ? (
          <>
            <dl className={`insights-stats ${showOpenings ? 'insights-three-stats' : ''}`}>
              {owner && (
                <Metric
                  label="Openings"
                  icon="eye"
                  value={data.viewCount}
                  caption={`since ${collectionDate(data.collectedFrom)} · UTC`}
                />
              )}
              <Metric
                label="Score"
                icon="score"
                value={data.voteScore}
                caption={
                  owner && 'upvoteCount' in data
                    ? `${insightsNumber(data.upvoteCount)} ${data.upvoteCount === 1 ? 'upvote' : 'upvotes'} · ${insightsNumber(data.downvoteCount)} ${data.downvoteCount === 1 ? 'downvote' : 'downvotes'}`
                    : undefined
                }
              />
              <Metric label="Comments" icon="comments" value={data.commentCount} />
              {!owner && expanded && (
                <Metric
                  label="Openings"
                  icon="eye"
                  value={data.viewCount}
                  caption={`since ${collectionDate(data.collectedFrom)} · UTC`}
                />
              )}
            </dl>
            {publicZero && (
              <div className="insights-zero">
                <InsightsIcon name="zero" />
                No activity recorded yet. The post may receive activity later.
              </div>
            )}
            {ownerZero && (
              <div className="insights-zero insights-owner-zero">
                <InsightsIcon name="zero" />
                No openings recorded in this period.
              </div>
            )}
            <div id={detailsId}>
              {!owner && expanded && (
                <p className="insights-public-note">
                  Openings are counted since {collectionDate(data.collectedFrom)} UTC. They are not
                  unique readers.
                </p>
              )}
              {owner &&
                (expanded ? (
                  <AuthorOpeningsTrend trend={trend} period={period} onPeriodChange={setPeriod} />
                ) : (
                  mini && (
                    <div className="insights-compact">
                      <div>
                        <strong>7 days</strong>
                        <p>{range} · UTC · daily openings</p>
                      </div>
                      <div className="insights-mini-summary">
                        <div className="insights-mini-bars" aria-hidden="true">
                          {mini.days.map((day) => {
                            const max = Math.max(
                              1,
                              ...mini.days.map((d) => (d.measured ? (d.openings ?? 0) : 0))
                            );
                            const partial = day.date === utcDay(trend.data!.generatedAt);
                            return (
                              <span
                                key={day.date}
                                className={`${partial ? 'insights-partial' : ''} ${!day.measured ? 'insights-unmeasured' : ''}`}
                                style={{
                                  height: day.measured
                                    ? Math.max(2, ((day.openings ?? 0) / max) * 30)
                                    : 2,
                                }}
                              />
                            );
                          })}
                        </div>
                        <p>Last 7 days: {insightsNumber(mini.total)} openings</p>
                      </div>
                    </div>
                  )
                ))}
            </div>
          </>
        ) : null}
      </div>
      <span className="sr-only" role="status">
        {refreshing ? 'Updating post insights…' : ''}
      </span>
    </section>
  );
}

interface MetricProps {
  label: string;
  icon: string;
  value: number;
  caption?: string;
}

function Metric({ label, icon, value, caption }: MetricProps) {
  return (
    <div>
      <dt>
        <InsightsIcon name={icon} />
        {label}
      </dt>
      <dd className="insights-value">{insightsNumber(value)}</dd>
      {caption && <dd className="insights-caption">{caption}</dd>}
    </div>
  );
}
