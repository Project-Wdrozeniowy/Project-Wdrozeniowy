import { useMyActivitySummary } from '@/shared/api/analytics/useMyActivitySummary';
import StatCard from './StatCard';

/** The signed-in user's own totals. Mounted only for a member, so a guest asks for nothing. */
export default function OwnStatCards() {
  const mine = useMyActivitySummary();
  // A query that is not enabled is not "loading" (isLoading), and a failed refresh keeps the
  // last figures (isLoadingError).
  const state = { isPending: mine.isLoading, isError: mine.isLoadingError };

  return (
    <>
      <StatCard label="Your posts" caption="All time" value={mine.data?.totalPosts} {...state} />
      <StatCard
        label="Upvotes you received"
        caption="All time"
        value={mine.data?.totalUpvotesReceived}
        {...state}
      />
    </>
  );
}
