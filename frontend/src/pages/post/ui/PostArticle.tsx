import { useId } from 'react';
import { fullDate, postBadges } from '@/pages/post/lib/postView';
import ActionButton from '@/features/post-interactions/ActionButton';
import ActionLink from '@/features/post-interactions/ActionLink';
import { PostVoteColumn } from '@/features/post-interactions/PostVoteColumn';
import type { PostDto as Post } from '@/shared/api/generated/models/postDto.dto';
import { authorName, initialOf } from '@/shared/lib/author';
import { topicHref } from '@/shared/lib/topicUrl';
import CategoryChip from '@/shared/ui/CategoryChip';
import { CommentIcon, SaveIcon, ShareIcon } from '@/shared/ui/icons';
import { formatTimeAgo } from '@/utils/format';
import { ACTION_UNAVAILABLE_HINT, PostTagLinks } from '@/widgets/post-feed';

interface PostArticleProps {
  post: Post;
}

/**
 * The post of the thread page. The text is user content and is shown as plain text (line breaks
 * kept), never as markup.
 */
export default function PostArticle({ post }: PostArticleProps) {
  const titleId = useId();
  const name = authorName(post.author);
  const badges = postBadges(post);

  return (
    <article
      aria-labelledby={titleId}
      className="bg-surface rounded-xl p-6 flex gap-4 border border-line"
    >
      <PostVoteColumn postId={post.id} score={post.voteScore} myVote={post.myVote} />

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            aria-hidden="true"
            className="w-6 h-6 rounded-full bg-raised flex items-center justify-center shrink-0"
          >
            <span className="text-fg text-xs font-bold">{initialOf(name)}</span>
          </div>
          <span className="text-fg font-semibold text-sm">{name}</span>
          <time
            dateTime={post.createdAt}
            title={fullDate(post.createdAt)}
            className="text-fg-subtle text-xs"
          >
            • {formatTimeAgo(post.createdAt)}
          </time>
          {badges.map((badge) => (
            <span
              key={badge}
              className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded"
            >
              {badge}
            </span>
          ))}
        </div>

        <h1 id={titleId} className="text-fg font-bold text-2xl leading-snug break-words">
          {post.title}
        </h1>

        {post.category && (
          <CategoryChip
            name={post.category.name}
            slug={post.category.slug}
            href={topicHref({ name: post.category.name, slug: post.category.slug })}
          />
        )}

        <PostTagLinks
          tags={post.tags.map(({ name: tagName, slug }) => ({ name: tagName, slug }))}
        />

        <div className="text-fg-muted text-base leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ActionLink
            icon={<CommentIcon />}
            label={`${post.commentCount} Comments`}
            to="#comments"
            replace
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
