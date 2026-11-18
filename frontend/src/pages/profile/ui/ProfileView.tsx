import { useMyProfile } from '@/shared/api/profile/useMyProfile';
import ProfileCard from './ProfileCard';
import ProfileLoadError from '@/shared/ui/ProfileLoadError';
import ProfileSkeleton from './ProfileSkeleton';

/**
 * The signed-in user's profile, loaded from `GET /users/me`. Editing lives on the settings page.
 * An expired session never shows up here: the session coordinator handles confirmed expiry.
 */
export default function ProfileView() {
  const { data, isPending, isLoadingError, isFetching, refetch } = useMyProfile();

  // A failed refresh keeps the profile on screen, so only "never loaded" is a full error.
  if (isLoadingError) {
    return <ProfileLoadError onRetry={() => refetch()} retrying={isFetching} />;
  }
  if (isPending) {
    return <ProfileSkeleton />;
  }

  return <ProfileCard profile={data} />;
}
