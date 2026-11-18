import type { PostSummaryDto } from '@/shared/api/generated/models/postSummaryDto.dto';

/**
 * The posts of all loaded pages, each once. The pages are offset-based: when a post is published
 * (or the list is reloaded) between two requests, the last post of one page can come again as
 * the first of the next.
 */
export function uniquePosts(posts: PostSummaryDto[]): PostSummaryDto[] {
  const seen = new Set<number>();
  return posts.filter((post) => (seen.has(post.id) ? false : (seen.add(post.id), true)));
}
