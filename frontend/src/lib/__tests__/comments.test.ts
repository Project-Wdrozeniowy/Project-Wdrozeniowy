import { AxiosError } from 'axios';
import {
  canDeleteComment,
  canReplyToComment,
  getApiErrorMessage,
  isCommentDeleted,
} from '../comments';
import type { Comment, UserProfile } from '@/shared/types';

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 1,
    username: 'alice',
    displayName: 'Alice',
    avatarUrl: null,
    bio: null,
    role: 'USER',
    status: 'ACTIVE',
    postCount: 0,
    commentCount: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 10,
    postId: 1,
    parentId: null,
    content: 'hello',
    status: 'VISIBLE',
    voteScore: 0,
    depth: 0,
    author: { id: 1, username: 'alice', displayName: 'Alice', avatarUrl: null, role: 'USER' },
    replies: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isCommentDeleted', () => {
  it('is true only for DELETED comments', () => {
    expect(isCommentDeleted(makeComment({ status: 'DELETED' }))).toBe(true);
    expect(isCommentDeleted(makeComment({ status: 'VISIBLE' }))).toBe(false);
  });
});

describe('canDeleteComment', () => {
  it('allows the author', () => {
    expect(canDeleteComment(makeComment(), makeUser({ id: 1 }))).toBe(true);
  });

  it('allows moderators and admins on other users’ comments', () => {
    expect(canDeleteComment(makeComment(), makeUser({ id: 2, role: 'MODERATOR' }))).toBe(true);
    expect(canDeleteComment(makeComment(), makeUser({ id: 3, role: 'ADMIN' }))).toBe(true);
  });

  it('denies other regular users', () => {
    expect(canDeleteComment(makeComment(), makeUser({ id: 2 }))).toBe(false);
  });

  it('denies guests', () => {
    expect(canDeleteComment(makeComment(), null)).toBe(false);
  });

  it('denies deleting an already deleted comment', () => {
    const deleted = makeComment({ status: 'DELETED', content: null, author: null });
    expect(canDeleteComment(deleted, makeUser({ role: 'ADMIN' }))).toBe(false);
  });
});

describe('canReplyToComment', () => {
  it('requires a signed-in user', () => {
    expect(canReplyToComment(makeComment(), null)).toBe(false);
    expect(canReplyToComment(makeComment(), makeUser())).toBe(true);
  });

  it('is allowed up to depth 4 and blocked at the maximum depth', () => {
    expect(canReplyToComment(makeComment({ depth: 4 }), makeUser())).toBe(true);
    expect(canReplyToComment(makeComment({ depth: 5 }), makeUser())).toBe(false);
  });

  it('is blocked for deleted comments', () => {
    expect(canReplyToComment(makeComment({ status: 'DELETED' }), makeUser())).toBe(false);
  });
});

describe('getApiErrorMessage', () => {
  it('returns the ProblemDetail detail from an API error', () => {
    const error = new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: {} as never,
      data: { status: 422, detail: 'Maximum comment nesting depth (5) exceeded' },
    });
    expect(getApiErrorMessage(error, 'fallback')).toBe(
      'Maximum comment nesting depth (5) exceeded'
    );
  });

  it('falls back when the API error has no detail', () => {
    const error = new AxiosError('network down');
    expect(getApiErrorMessage(error, 'fallback')).toBe('fallback');
  });

  it('falls back for non-API errors', () => {
    expect(getApiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
    expect(getApiErrorMessage('weird', 'fallback')).toBe('fallback');
  });
});
