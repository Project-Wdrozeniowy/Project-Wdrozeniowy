import ProfileTabs from './_components/ProfileTabs';
import PostsSkeleton from './_components/PostsSkeleton';
import ProfileView from './_components/ProfileView';

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      <ProfileView />
      <ProfileTabs />
      <PostsSkeleton />
    </div>
  );
}
