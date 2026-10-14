import ProfileTabs from './_ui/ProfileTabs';
import PostsSkeleton from './_ui/PostsSkeleton';
import ProfileView from './_ui/ProfileView';

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      <ProfileView />
      <ProfileTabs />
      <PostsSkeleton />
    </div>
  );
}
