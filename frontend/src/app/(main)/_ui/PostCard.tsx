import { ACTION_UNAVAILABLE_HINT } from '@/app/(main)/_ui/postCard.const';
import { getCategoryColor } from '@/app/(main)/forum/_lib/categoryColor';
import type { PostCardData } from '@/app/(main)/forum/_lib/postCard';
import { cn } from '@/shared/lib/cn';
import { CommentIcon, ShareIcon, SaveIcon } from '@/shared/ui/icons';
import ActionButton from '@/features/post-interactions/ActionButton';
import { LocalVoteColumn } from '@/features/post-interactions/LocalVoteColumn';
import { PostVoteColumn } from '@/features/post-interactions/PostVoteColumn';

interface PostCardProps {
  post: PostCardData;
}

export default function PostCard({ post }: PostCardProps) {
  const { actionsEnabled, voting } = post;
  const actionHint = actionsEnabled ? undefined : ACTION_UNAVAILABLE_HINT;

  const categoryColor = post.category
    ? getCategoryColor({ name: post.category, slug: post.categorySlug })
    : '';

  return (
    <article className="bg-slate-800 rounded-xl p-5 flex gap-4 hover:bg-slate-800/80 transition-colors">
      {voting ? (
        <PostVoteColumn postId={voting.postId} score={post.votes} myVote={voting.myVote} />
      ) : (
        <LocalVoteColumn score={post.votes} />
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{post.userInitial}</span>
          </div>
          <span className="text-white font-semibold text-sm">{post.username}</span>
          <span className="text-slate-400 text-xs">• {post.timeAgo}</span>
          {post.badge && (
            <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
              {post.badge}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-gray-50 font-semibold text-xl leading-snug break-words">
            {post.title}
          </h2>
          {post.category && (
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded border self-start',
                categoryColor
              )}
            >
              {post.category}
            </span>
          )}
          {post.excerpt && (
            <p className="text-slate-400 text-base leading-relaxed line-clamp-2">{post.excerpt}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton
            icon={<CommentIcon />}
            label={`${post.comments} Comments`}
            disabled={!actionsEnabled}
            title={actionHint}
          />
          <ActionButton
            icon={<ShareIcon />}
            label="Share"
            disabled={!actionsEnabled}
            title={actionHint}
          />
          <ActionButton
            icon={<SaveIcon />}
            label="Save"
            disabled={!actionsEnabled}
            title={actionHint}
          />
        </div>
      </div>
    </article>
  );
}
