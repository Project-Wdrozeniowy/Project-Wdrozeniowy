import type { MockPost } from '@/constants/posts';
import { PINNED_BADGE_LABEL } from '@/constants/forum';
import type { PostSummary } from '@/shared/types';
import { formatTimeAgo } from '@/utils/format';

/** What `PostCard` renders. Both the real API and the mock feed are mapped to it. */
export interface PostCardData {
  id: string;
  /** Link to the post page; the title is plain text when absent. */
  href?: string;
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
}

export function toPostCardData(post: PostSummary, now?: number): PostCardData {
  const username = post.author.displayName?.trim() || post.author.username;
  return {
    id: String(post.id),
    href: `/forum/${encodeURIComponent(post.slug)}`,
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
  };
}

/** The home page still renders fixtures (PWDRZ-111 migrates it to the API). */
export function mockToPostCardData(post: MockPost): PostCardData {
  return {
    id: post.id,
    username: post.username,
    userInitial: post.userInitial,
    timeAgo: post.timeAgo,
    badge: post.badge,
    category: post.category,
    title: post.title,
    excerpt: post.excerpt,
    votes: post.votes,
    comments: post.comments,
  };
}
