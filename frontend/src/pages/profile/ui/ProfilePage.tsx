import ProfileTabs from './ProfileTabs';
import PostsSkeleton from './PostsSkeleton';
import ProfileView from './ProfileView';

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      <ProfileView />
      <ProfileTabs />
      <PostsSkeleton />
    </div>
  );
}
