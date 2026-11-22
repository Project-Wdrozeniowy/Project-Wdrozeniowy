import { PINNED_BADGE_LABEL } from '@/widgets/post-feed/config/postCard.const';
import type { PostDto as Post } from '@/shared/api/generated/models/postDto.dto';
import type { PostSummaryDto as PostSummary } from '@/shared/api/generated/models/postSummaryDto.dto';
import type { MyVoteDto as MyVote } from '@/shared/api/generated/models/myVoteDto.dto';
import { authorName, initialOf } from '@/shared/lib/author';
import { formatTimeAgo } from '@/utils/format';

export interface PostCardTag {
  name: string;
  slug: string;
}

/** What `PostCard` renders. Both the real API and the mock feed are mapped to it. */
export interface PostCardData {
  id: string;
  /** The address of the post's page. */
  slug: string;
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
  /** Tags of the post, as the feed lists them (compact: name and slug, at most 5, A to Z). */
  tags: PostCardTag[];
  /** What voting needs: the post to vote on and the user's current vote. */
  voting: { postId: number; myVote: MyVote | null };
}

/** A listed `PostSummary` and a full `Post` both carry their tags; each tag becomes a link. */
export function toPostCardData(post: PostSummary | Post, now?: number): PostCardData {
  const username = authorName(post.author);
  return {
    id: String(post.id),
    slug: post.slug,
    username,
    userInitial: initialOf(username),
    timeAgo: formatTimeAgo(post.createdAt, now),
    badge: post.pinned ? PINNED_BADGE_LABEL : null,
    category: post.category?.name ?? null,
    categorySlug: post.category?.slug ?? null,
    title: post.title,
    excerpt: null,
    votes: post.voteScore,
    comments: post.commentCount,
    // A malformed post (tags null or missing) shows no tags instead of breaking the whole feed.
    tags: Array.isArray(post.tags) ? post.tags.map(({ name, slug }) => ({ name, slug })) : [],
    voting: { postId: post.id, myVote: post.myVote },
  };
}

/** "1 Comment", "3 Comments": the text of the link to a post's comments. */
export function commentsLabel(count: number): string {
  return `${count} ${count === 1 ? 'Comment' : 'Comments'}`;
}
