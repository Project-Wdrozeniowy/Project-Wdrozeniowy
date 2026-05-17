import ProfileCard from './_components/ProfileCard';
import ProfileTabs from './_components/ProfileTabs';
import PostsSkeleton from './_components/PostsSkeleton';

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      <ProfileCard />
      <ProfileTabs />
      <PostsSkeleton />
    </div>
  );
}
