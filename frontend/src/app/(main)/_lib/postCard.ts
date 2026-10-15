import { PINNED_BADGE_LABEL } from '@/app/(main)/_lib/postCard.const';
import type { PostSummary } from '@/shared/api/forum/post.dto';
import type { MyVote } from '@/shared/api/forum/vote.dto';
import { formatTimeAgo } from '@/utils/format';

/** What `PostCard` renders. Both the real API and the mock feed are mapped to it. */
export interface PostCardData {
  id: string;
  username: string;
  userInitial: string;
  timeAgo: string;
  badge: string | null;
  /** Display name of the category, `null` when the post has none. */
  category: string | null;
  /** Stable identifier of the category, used for its color. */
  categorySlug?: string | null;
  title: string;
  /** The listing API does not return post text, so real posts have no excerpt. */
  excerpt: string | null;
  votes: number;
  comments: number;
  /** What voting needs: the post to vote on and the user's current vote. */
  voting: { postId: number; myVote: MyVote | null };
}

export function toPostCardData(post: PostSummary, now?: number): PostCardData {
  const username = post.author.displayName?.trim() || post.author.username;
  return {
    // No link to the post: the post page is a placeholder until the view page is implemented.
    id: String(post.id),
    username,
    // Array.from keeps a surrogate pair (emoji) whole, unlike charAt(0).
    userInitial: (Array.from(username)[0] ?? '').toUpperCase(),
    timeAgo: formatTimeAgo(post.createdAt, now),
    badge: post.pinned ? PINNED_BADGE_LABEL : null,
    category: post.category?.name ?? null,
    categorySlug: post.category?.slug ?? null,
    title: post.title,
    excerpt: null,
    votes: post.voteScore,
    comments: post.commentCount,
    voting: { postId: post.id, myVote: post.myVote },
  };
}
