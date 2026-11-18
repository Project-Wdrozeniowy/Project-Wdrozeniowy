import { useParams } from 'react-router';
import { CommentSection } from '@/features/post-comments/CommentSection';

export default function PostPage() {
  const { slug = '' } = useParams();

  return (
    <div className="flex flex-col gap-6">
      {/* Post content placeholder */}
      <div className="bg-surface rounded-xl p-6 flex flex-col gap-4 border border-line">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-raised animate-pulse" />
          <div className="h-3 w-24 bg-raised rounded animate-pulse" />
        </div>
        <div className="h-7 w-2/3 bg-raised rounded animate-pulse" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 bg-raised rounded animate-pulse" />
          ))}
        </div>
        <div className="flex gap-4">
          <div className="h-3 w-16 bg-raised rounded animate-pulse" />
          <div className="h-3 w-20 bg-raised rounded animate-pulse" />
        </div>
        <p className="text-fg-subtle text-xs">Post slug: {slug}</p>
      </div>

      <CommentSection slug={slug} />
    </div>
  );
}
