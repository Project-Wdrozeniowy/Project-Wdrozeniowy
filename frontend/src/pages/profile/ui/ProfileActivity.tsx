import {
  PROFILE_ACTIVITY_CHART_TEXT,
  PROFILE_ACTIVITY_ERROR_TEXT,
  PROFILE_ACTIVITY_LOADING_LABEL,
  PROFILE_ACTIVITY_TITLE,
  PROFILE_FIGURE_LABELS,
  PROFILE_LAST_ACTIVE_LABEL,
  PROFILE_LAST_ACTIVE_UNKNOWN_TEXT,
  PROFILE_NO_ACTIVITY_TEXT,
} from '@/pages/profile/config/profileView.const';
import { useMyActivitySummary } from '@/shared/api/analytics/useMyActivitySummary';
import { cn } from '@/shared/lib/cn';
import { formatDate } from '@/shared/lib/formatDate';
import { CommentIcon, PostIcon } from '@/shared/ui/icons';
import QueryState from '@/shared/ui/QueryState';
import SkeletonStatus from '@/shared/ui/SkeletonStatus';

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

/**
 * The "Activity" section: the user's own totals. It is the only reader of the totals while it is
 * open (the profile card hides its own copy), so a failure is shown once. PROVISIONAL: the chart
 * over time is PWDRZ-153's, because the API has no per-day series of the user's own activity.
 */
export default function ProfileActivity() {
  const query = useMyActivitySummary();
  const data = query.data;
  const lastActive = data ? formatDate(data.lastActivityAt, dateFormat) : null;
  // No date next to totals that are not zero would contradict them: say it is unknown instead.
  const noActivity = data ? data.totalPosts + data.totalComments === 0 : false;
  const withIcon = data
    ? [
        {
          label: PROFILE_FIGURE_LABELS.posts,
          value: data.totalPosts,
          icon: <PostIcon />,
          tint: 'bg-blue-500/15 text-accent',
        },
        {
          label: PROFILE_FIGURE_LABELS.comments,
          value: data.totalComments,
          icon: <CommentIcon />,
          tint: 'bg-emerald-500/15 text-success',
        },
      ]
    : [];
  const votes = data
    ? [
        { label: PROFILE_FIGURE_LABELS.upvotesReceived, value: data.totalUpvotesReceived },
        { label: PROFILE_FIGURE_LABELS.downvotesReceived, value: data.totalDownvotesReceived },
        { label: PROFILE_FIGURE_LABELS.votesCast, value: data.totalVotesCast },
      ]
    : [];

  return (
    <section
      aria-label={PROFILE_ACTIVITY_TITLE}
      className="bg-surface rounded-xl p-5 flex flex-col gap-4 border border-line"
    >
      <h2 className="text-fg font-semibold text-xl leading-none">{PROFILE_ACTIVITY_TITLE}</h2>
      <QueryState
        query={query}
        errorText={PROFILE_ACTIVITY_ERROR_TEXT}
        skeleton={
          <SkeletonStatus label={PROFILE_ACTIVITY_LOADING_LABEL} className="flex flex-col gap-2">
            <div className="h-8 bg-raised rounded animate-pulse" />
            <div className="h-8 bg-raised rounded animate-pulse" />
            <div className="h-8 bg-raised rounded animate-pulse" />
          </SkeletonStatus>
        }
      >
        <dl className="flex flex-col gap-2">
          {withIcon.map(({ label, value, icon, tint }) => (
            <div key={label} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  tint
                )}
              >
                {icon}
              </span>
              <dt className="text-fg text-sm flex-1">{label}</dt>
              <dd className="text-fg font-bold text-lg">{value.toLocaleString('en-US')}</dd>
            </div>
          ))}
          {votes.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-fg">{label}</dt>
              <dd className="text-fg font-bold">{value.toLocaleString('en-US')}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 text-sm pt-1">
            <dt className="text-fg-subtle">{PROFILE_LAST_ACTIVE_LABEL}</dt>
            <dd className="text-fg-soft">
              {lastActive ??
                (noActivity ? PROFILE_NO_ACTIVITY_TEXT : PROFILE_LAST_ACTIVE_UNKNOWN_TEXT)}
            </dd>
          </div>
        </dl>
        <p className="text-fg-subtle text-xs">{PROFILE_ACTIVITY_CHART_TEXT}</p>
      </QueryState>
    </section>
  );
}
