import { useMyProfile } from '@/shared/api/profile/currentUser';
import { getLoadPhase } from '@/shared/lib/loadPhase';
import ProfileCard from './ProfileCard';
import ProfileLoadError from '@/shared/ui/ProfileLoadError';
import ProfileVotes from './ProfileVotes';
import ProfileSkeleton from './ProfileSkeleton';

/**
 * The signed-in user's profile, loaded from `GET /users/me`. Editing lives on the settings page.
 * An expired session never shows up here: the session coordinator handles confirmed expiry.
 */
interface ProfileViewProps {
  /** The vote totals in the card. Off while another section shows the same totals. */
  showVotes?: boolean;
}

export default function ProfileView({ showVotes = true }: ProfileViewProps) {
  const query = useMyProfile();
  const { data, refetch } = query;
  const phase = getLoadPhase(query);

  // A failed refresh keeps the profile on screen, so only "never loaded" is a full error.
  if (phase === 'failed' || phase === 'retrying') {
    return <ProfileLoadError onRetry={() => refetch()} retrying={phase === 'retrying'} />;
  }
  if (phase === 'loading' || !data) {
    return <ProfileSkeleton />;
  }

  return <ProfileCard profile={data} votes={showVotes ? <ProfileVotes /> : undefined} />;
}
