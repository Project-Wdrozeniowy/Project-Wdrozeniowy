import {
  PROFILE_FIGURE_LABELS,
  PROFILE_VOTES_ERROR_TEXT,
  PROFILE_VOTES_LOADING_LABEL,
} from '@/pages/profile/config/profileView.const';
import { useMyActivitySummary } from '@/shared/api/analytics/useMyActivitySummary';
import QueryState from '@/shared/ui/QueryState';
import SkeletonStatus from '@/shared/ui/SkeletonStatus';

/**
 * The votes the user gave and received (all time). The value is shown above its label
 * (`flex-col-reverse`), while the label comes first in the document, as a description list wants.
 */
export default function ProfileVotes() {
  const query = useMyActivitySummary();
  const figures = query.data
    ? [
        { label: PROFILE_FIGURE_LABELS.upvotesReceived, value: query.data.totalUpvotesReceived },
        {
          label: PROFILE_FIGURE_LABELS.downvotesReceived,
          value: query.data.totalDownvotesReceived,
        },
        { label: PROFILE_FIGURE_LABELS.votesCast, value: query.data.totalVotesCast },
      ]
    : [];

  return (
    <QueryState
      query={query}
      errorText={PROFILE_VOTES_ERROR_TEXT}
      skeleton={
        <SkeletonStatus label={PROFILE_VOTES_LOADING_LABEL} className="flex gap-6">
          <div className="h-10 w-28 bg-raised rounded animate-pulse" />
          <div className="h-10 w-28 bg-raised rounded animate-pulse" />
          <div className="h-10 w-28 bg-raised rounded animate-pulse" />
        </SkeletonStatus>
      }
    >
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        {figures.map(({ label, value }) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="text-fg-subtle text-sm lowercase">{label}</dt>
            <dd className="text-fg font-bold text-lg">{value.toLocaleString('en-US')}</dd>
          </div>
        ))}
      </dl>
    </QueryState>
  );
}
