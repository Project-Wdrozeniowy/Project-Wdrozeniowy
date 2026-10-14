'use client';

import { useMyProfile } from '@/shared/api/profile/useMyProfile';
import ProfileCard from './ProfileCard';
import ProfileForm from '../../../../../features/edit-profile/ProfileForm';
import ProfileLoadError from './ProfileLoadError';
import ProfileSkeleton from './ProfileSkeleton';

/**
 * The signed-in user's profile, loaded from `GET /users/me`, with the edit form.
 * An expired session never shows up here: the API client refreshes it or sends the user to /login.
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

  return (
    <>
      <ProfileCard profile={data} />
      <ProfileForm profile={data} />
    </>
  );
}
