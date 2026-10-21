import { SEARCH_MAX_LENGTH } from '@/shared/api/search/searchQuery.const';
import type { PostSummary } from '@/shared/api/forum/post.dto';
import type { Tag } from '@/shared/api/forum/tag.dto';
import type { UserSummary } from '@/shared/api/user/user.dto';
import type { SearchResults, SearchType } from '@/shared/api/search/search.dto';
import { SEARCH_MAX_PAGES } from './searchPage.const';

/** The `q` of the URL as the API takes it: trimmed and not longer than the API allows. */
export function parseSearchTerm(raw: string | null): string {
  return (raw ?? '').trim().slice(0, SEARCH_MAX_LENGTH);
}

/** The `type` of the URL; anything that is not a known kind means "all". */
export function parseSearchType(raw: string | null): SearchType | undefined {
  return raw === 'POST' || raw === 'USER' || raw === 'TAG' ? raw : undefined;
}

/** The `page` of the URL: how many pages are shown, 1-based. */
export function parsePagesParam(raw: string | null): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return 1;
  return Math.min(value, SEARCH_MAX_PAGES);
}

interface ItemsByKind {
  posts: PostSummary;
  users: UserSummary;
  tags: Tag;
}

/** Items of one kind over all loaded pages. Offset paging can repeat an item, so repeats go. */
export function collectItems<K extends keyof ItemsByKind>(
  pages: readonly (SearchResults | undefined)[],
  kind: K
): ItemsByKind[K][] {
  const byId = new Map<number, ItemsByKind[K]>();
  for (const page of pages) {
    const content = (page?.[kind]?.content ?? []) as ItemsByKind[K][];
    for (const item of content) byId.set(item.id, item);
  }
  return [...byId.values()];
}

/** Whether any kind still has a page after the one loaded last. */
export function hasMorePages(last: SearchResults | undefined): boolean {
  if (!last) return false;
  return [last.posts, last.users, last.tags].some((page) => page !== null && !page.last);
}

/** Matches over every kind that was asked for, from the first page. */
export function totalMatches(first: SearchResults): number {
  return [first.posts, first.users, first.tags].reduce(
    (sum, page) => sum + (page?.totalElements ?? 0),
    0
  );
}
