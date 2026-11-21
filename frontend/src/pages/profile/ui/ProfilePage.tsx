import { useSearchParams } from 'react-router';
import { PROFILE_TAB_PARAM } from '@/pages/profile/config/profileView.const';
import { parseProfileTab } from '@/pages/profile/lib/profileTab';
import { useMyProfile } from '@/shared/api/profile/useMyProfile';
import ProfileActivity from './ProfileActivity';
import ProfilePosts from './ProfilePosts';
import ProfileTabs from './ProfileTabs';
import ProfileView from './ProfileView';

export default function ProfilePage() {
  // The same cached profile the card above reads; its username decides whose posts are listed.
  const { data, isLoadingError } = useMyProfile();
  const [params] = useSearchParams();
  const tab = parseProfileTab(params.get(PROFILE_TAB_PARAM));

  return (
    <div className="flex flex-col gap-4">
      <ProfileView showVotes={tab !== 'activity'} />
      <ProfileTabs active={tab} />
      {/* If the profile failed to load, the card above says so with a retry: whose posts are these? */}
      {tab === 'posts' && !isLoadingError && <ProfilePosts username={data?.username ?? ''} />}
      {tab === 'activity' && <ProfileActivity />}
    </div>
  );
}
