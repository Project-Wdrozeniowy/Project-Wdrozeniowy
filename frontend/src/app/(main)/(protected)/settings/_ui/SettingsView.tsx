'use client';

import ProfileLoadError from '@/app/(main)/(protected)/profile/_ui/ProfileLoadError';
import ChangePasswordForm from '@/features/change-password/ChangePasswordForm';
import ProfileForm from '@/features/edit-profile/ProfileForm';
import { useMyProfile } from '@/shared/api/profile/useMyProfile';
import SettingsSkeleton from './SettingsSkeleton';

/**
 * The account fields the backend supports and the password change.
 * The account form is the profile page's own editor: one component, one cache (`useMyProfile`)
 * and one save path (`PATCH /users/me`), so the two pages cannot disagree.
 */
export default function SettingsView() {
  const { data, isPending, isLoadingError, isFetching, refetch } = useMyProfile();

  // A failed refresh keeps the form on screen, so only "never loaded" is a full error.
  if (isLoadingError) {
    return <ProfileLoadError onRetry={() => refetch()} retrying={isFetching} />;
  }
  if (isPending) {
    return <SettingsSkeleton />;
  }

  return (
    <>
      <ProfileForm profile={data} />
      <ChangePasswordForm />
    </>
  );
}
