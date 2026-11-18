import { Link } from 'react-router';
import { ACTION_UNAVAILABLE_HINT } from '@/widgets/post-feed/config/postCard.const';
import type { PostCardData } from '@/widgets/post-feed/lib/postCard';
import { CommentIcon, ShareIcon, SaveIcon } from '@/shared/ui/icons';
import PostTagLinks from './PostTagLinks';
import CategoryChip from '@/shared/ui/CategoryChip';
import ActionButton from '@/features/post-interactions/ActionButton';
import ActionLink from '@/features/post-interactions/ActionLink';
import { postHref } from '@/shared/lib/searchUrl';
import { PostVoteColumn } from '@/features/post-interactions/PostVoteColumn';

interface PostCardProps {
  post: PostCardData;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="bg-surface rounded-xl p-5 flex gap-4 hover:bg-raised/50 transition-colors border border-line">
      <PostVoteColumn postId={post.voting.postId} score={post.votes} myVote={post.voting.myVote} />

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-6 h-6 rounded-full bg-raised flex items-center justify-center shrink-0">
            <span className="text-fg text-xs font-bold">{post.userInitial}</span>
          </div>
          <span className="text-fg font-semibold text-sm">{post.username}</span>
          <span className="text-fg-subtle text-xs">• {post.timeAgo}</span>
          {post.badge && (
            <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
              {post.badge}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-fg font-semibold text-xl leading-snug break-words">
            <Link
              to={postHref(post.slug)}
              className="hover:text-accent focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              {post.title}
            </Link>
          </h2>
          {post.category && <CategoryChip name={post.category} slug={post.categorySlug} />}
          {post.excerpt && (
            <p className="text-fg-subtle text-base leading-relaxed line-clamp-2">{post.excerpt}</p>
          )}
        </div>

        <PostTagLinks tags={post.tags} />

        <div className="flex items-center gap-2 flex-wrap">
          <ActionLink
            icon={<CommentIcon />}
            label={`${post.comments} Comments`}
            to={`${postHref(post.slug)}#comments`}
          />
          <ActionButton
            icon={<ShareIcon />}
            label="Share"
            disabled
            title={ACTION_UNAVAILABLE_HINT}
          />
          <ActionButton icon={<SaveIcon />} label="Save" disabled title={ACTION_UNAVAILABLE_HINT} />
        </div>
      </div>
    </article>
  );
}
