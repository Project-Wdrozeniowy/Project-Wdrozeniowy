import { POST_PINNED_LABEL, POST_STATUS_LABELS } from '@/pages/post/config/post.const';
import type { PostDto as Post } from '@/shared/api/generated/models/postDto.dto';
import { apiErrorStatus } from '@/shared/api/client/apiError';

/** The badges of a post: pinned, and locked or draft. A deleted post is never shown. */
export function postBadges(post: Pick<Post, 'pinned' | 'status'>): string[] {
  const badges: string[] = [];
  if (post.pinned) badges.push(POST_PINNED_LABEL);
  if (post.status === 'LOCKED') badges.push(POST_STATUS_LABELS.LOCKED);
  if (post.status === 'DRAFT') badges.push(POST_STATUS_LABELS.DRAFT);
  return badges;
}

/** A post that does not exist, was deleted, or is a draft the reader may not see: all one 404. */
export function isPostNotFound(error: unknown): boolean {
  return apiErrorStatus(error) === 404;
}

/** "18 November 2026, 10:00", for the tooltip of the relative time. Empty for a bad date. */
export function fullDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
}
