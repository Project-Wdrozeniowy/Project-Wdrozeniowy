'use client';

import { useMyProfile } from '@/hooks/useMyProfile';
import { profileToFormValues } from '@/lib/profile';
import ProfileCard from './ProfileCard';
import ProfileForm from './ProfileForm';
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
      {/* The form reads its starting values once. A new key (the server's editable values changed,
          e.g. an edit from another device) gives an untouched form the fresh values, so Save can
          never write stale ones back. Refreshes that change nothing the form shows keep edits. */}
      <ProfileForm key={JSON.stringify(profileToFormValues(data))} profile={data} />
    </>
  );
}
