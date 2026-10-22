import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import type { PostSummary } from '@/shared/api/forum/post.dto';
import type { Tag } from '@/shared/api/forum/tag.dto';
import type { UserSummary } from '@/shared/api/user/user.dto';

/** Kind filter of `GET /search`. Without it every kind is searched and paged on its own. */
export type SearchType = 'POST' | 'USER' | 'TAG';

export interface SearchParams {
  /** 2–100 characters after trimming, otherwise the API answers 400. */
  q: string;
  type?: SearchType;
  /** 0-based. */
  page?: number;
  /** 1–50. */
  size?: number;
}

/** `GET /search`. A kind left out by the `type` filter is `null`. */
export interface SearchResults {
  /** The query as the API matched it, without surrounding whitespace. */
  query: string;
  posts: PagedResponse<PostSummary> | null;
  users: PagedResponse<UserSummary> | null;
  tags: PagedResponse<Tag> | null;
}
