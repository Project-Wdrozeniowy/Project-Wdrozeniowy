import { useMyProfile } from '@/shared/api/profile/useMyProfile';
import ProfilePosts from './ProfilePosts';
import ProfileTabs from './ProfileTabs';
import ProfileView from './ProfileView';

export default function ProfilePage() {
  // The same cached profile the card above reads; its username decides whose posts are listed.
  const { data, isLoadingError } = useMyProfile();

  return (
    <div className="flex flex-col gap-4">
      <ProfileView />
      <ProfileTabs />
      {/* If the profile failed to load, the card above says so with a retry: whose posts are these? */}
      {!isLoadingError && <ProfilePosts username={data?.username ?? ''} />}
    </div>
  );
}
