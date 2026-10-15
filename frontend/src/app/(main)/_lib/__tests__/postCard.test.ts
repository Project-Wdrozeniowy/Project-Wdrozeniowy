import { PINNED_BADGE_LABEL } from '@/app/(main)/_lib/postCard.const';
import { toPostCardData } from '../postCard';
import type { PostSummary } from '@/shared/api/forum/post.dto';

const NOW = Date.parse('2026-10-10T12:00:00Z');

const summary: PostSummary = {
  id: 42,
  title: 'Hello',
  slug: 'hello world',
  status: 'PUBLISHED',
  pinned: false,
  viewCount: 5,
  voteScore: 7,
  myVote: null,
  commentCount: 3,
  category: {
    id: 1,
    name: 'Gaming',
    slug: 'gaming',
    description: null,
    displayOrder: 1,
    visible: true,
    createdAt: '2026-10-01T00:00:00Z',
  },
  author: { id: 1, username: 'alice', displayName: 'Alice A.', avatarUrl: null, role: 'USER' },
  lastActivityAt: '2026-10-10T10:00:00Z',
  createdAt: '2026-10-10T10:00:00Z',
};

describe('toPostCardData', () => {
  it('maps the API summary to what the card renders', () => {
    expect(toPostCardData(summary, NOW)).toEqual({
      id: '42',
      username: 'Alice A.',
      userInitial: 'A',
      timeAgo: '2 hours ago',
      badge: null,
      category: 'Gaming',
      categorySlug: 'gaming',
      title: 'Hello',
      excerpt: null,
      votes: 7,
      comments: 3,
      voting: { postId: 42, myVote: null },
    });
  });

  it('falls back to the username when there is no display name', () => {
    const data = toPostCardData(
      { ...summary, author: { ...summary.author, displayName: null } },
      NOW
    );
    expect(data.username).toBe('alice');
    expect(data.userInitial).toBe('A');
  });

  it('takes the whole first character, even an emoji, as the initial', () => {
    const data = toPostCardData(
      { ...summary, author: { ...summary.author, displayName: '😀 Bob' } },
      NOW
    );
    expect(data.userInitial).toBe('😀');
  });

  it('treats a blank display name as missing', () => {
    const data = toPostCardData(
      { ...summary, author: { ...summary.author, displayName: '  ' } },
      NOW
    );
    expect(data.username).toBe('alice');
  });

  it('handles a post without a category', () => {
    const data = toPostCardData({ ...summary, category: null }, NOW);
    expect(data.category).toBeNull();
    expect(data.categorySlug).toBeNull();
  });

  it('marks pinned posts', () => {
    expect(toPostCardData({ ...summary, pinned: true }, NOW).badge).toBe(PINNED_BADGE_LABEL);
  });
});

/** Captured from GET /api/forum/posts on the real backend (Postgres + Flyway schema). */
const REAL_API_ITEM: PostSummary = {
  author: { id: 1, username: 'alice', displayName: null, avatarUrl: null, role: 'USER' },
  category: {
    id: 2,
    name: 'Gaming',
    slug: 'gaming',
    description: null,
    displayOrder: 2,
    visible: true,
    createdAt: '2026-10-10T22:39:00.830154Z',
  },
  commentCount: 0,
  createdAt: '2026-10-10T22:39:12.674315Z',
  id: 8,
  lastActivityAt: '2026-10-10T22:39:12.67421Z',
  pinned: false,
  slug: 'gaming-post-3',
  status: 'PUBLISHED',
  title: 'Gaming post 3',
  viewCount: 0,
  voteScore: 0,
  myVote: null,
};

describe('toPostCardData with a real API response', () => {
  it('maps the payload the backend actually returns (no display name, no excerpt)', () => {
    const now = Date.parse('2026-10-10T22:49:13Z');
    expect(toPostCardData(REAL_API_ITEM, now)).toEqual({
      id: '8',
      username: 'alice',
      userInitial: 'A',
      timeAgo: '10 minutes ago',
      badge: null,
      category: 'Gaming',
      categorySlug: 'gaming',
      title: 'Gaming post 3',
      excerpt: null,
      votes: 0,
      comments: 0,
      voting: { postId: 8, myVote: null },
    });
  });
});

describe('voting data', () => {
  it("carries the user's own vote of an API post", () => {
    const myVote = { id: 9, voteType: 'DOWN' as const };
    expect(toPostCardData({ ...summary, myVote }, NOW).voting).toEqual({ postId: 42, myVote });
  });
});
