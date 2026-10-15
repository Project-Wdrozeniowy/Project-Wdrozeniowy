import type { MockPost } from '@/shared/api/forum/mockPosts.const';
import { PINNED_BADGE_LABEL } from '@/app/(main)/forum/_lib/postCard.const';
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
  /**
   * Sharing, saving and the comments button work only for the fixtures. Real posts have no API for
   * them yet, so those controls are disabled instead of pretending to succeed.
   */
  actionsEnabled: boolean;
  /** Set for posts from the API: what voting needs. `null` for fixtures, which vote locally. */
  voting: { postId: number; myVote: MyVote | null } | null;
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
    actionsEnabled: false,
    voting: { postId: post.id, myVote: post.myVote },
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
    actionsEnabled: true,
    voting: null,
  };
}
