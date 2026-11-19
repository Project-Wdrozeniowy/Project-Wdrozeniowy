import ProfileLoadError from '@/shared/ui/ProfileLoadError';
import ChangePasswordForm from '@/features/change-password/ChangePasswordForm';
import ProfileForm from '@/features/edit-profile/ProfileForm';
import { useMyProfile } from '@/shared/api/profile/useMyProfile';
import { getLoadPhase } from '@/shared/lib/loadPhase';
import {
  ACCOUNT_SECTION_FIELDS,
  ACCOUNT_SECTION_TITLE,
  PROFILE_SECTION_FIELDS,
  PROFILE_SECTION_TITLE,
} from '@/pages/settings/config/settingsView.const';
import type { OpenSettingsSectionId } from '@/pages/settings/config/settingsView.const';
import DangerZone from './DangerZone';
import SettingsSkeleton from './SettingsSkeleton';

interface SettingsViewProps {
  section: OpenSettingsSectionId;
}

/**
 * The content of one settings section. Both sections edit the profile the profile page shows:
 * one cache (`useMyProfile`) and one save path (`PATCH /users/me`), so the pages cannot disagree.
 */
export default function SettingsView({ section }: SettingsViewProps) {
  const query = useMyProfile();
  const { data, refetch } = query;
  const phase = getLoadPhase(query);

  // A failed refresh keeps the form on screen, so only "never loaded" is a full error.
  if (phase === 'failed' || phase === 'retrying') {
    return <ProfileLoadError onRetry={() => refetch()} retrying={phase === 'retrying'} />;
  }
  if (phase === 'loading' || !data) {
    return <SettingsSkeleton />;
  }

  if (section === 'account') {
    return (
      <>
        <ProfileForm profile={data} fields={ACCOUNT_SECTION_FIELDS} title={ACCOUNT_SECTION_TITLE} />
        <ChangePasswordForm />
        <DangerZone />
      </>
    );
  }
  return (
    <ProfileForm profile={data} fields={PROFILE_SECTION_FIELDS} title={PROFILE_SECTION_TITLE} />
  );
}
