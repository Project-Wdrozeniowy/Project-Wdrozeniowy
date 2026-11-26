import type { PostDto } from '@/shared/api/generated/models/postDto.dto';

/** Presentation eligibility only; Spring still authorizes every analytics read. */
export function canReadInsights(post: PostDto, viewerId?: number): boolean {
  return (
    post.status !== 'DELETED' &&
    (post.author.id === viewerId || ['PUBLISHED', 'LOCKED'].includes(post.status))
  );
}
