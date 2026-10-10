import axios from 'axios';
import { MAX_COMMENT_DEPTH } from '@/constants/comments';
import type { Comment, ProblemDetail, UserProfile } from '@/shared/types';

const STAFF_ROLES: ReadonlyArray<UserProfile['role']> = ['ADMIN', 'MODERATOR'];

/** Deleted comments are returned as placeholders without content or author. */
export function isCommentDeleted(comment: Comment): boolean {
  return comment.status === 'DELETED';
}

/** The author, moderators and admins may delete a comment. */
export function canDeleteComment(comment: Comment, user: UserProfile | null): boolean {
  if (!user || isCommentDeleted(comment)) return false;
  return comment.author?.id === user.id || STAFF_ROLES.includes(user.role);
}

export function canReplyToComment(comment: Comment, user: UserProfile | null): boolean {
  return user !== null && !isCommentDeleted(comment) && comment.depth < MAX_COMMENT_DEPTH;
}

/** Prefers the server's RFC 9457 `detail`, falling back to a caller-provided message. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ProblemDetail>(error)) {
    return error.response?.data?.detail ?? fallback;
  }
  return fallback;
}
