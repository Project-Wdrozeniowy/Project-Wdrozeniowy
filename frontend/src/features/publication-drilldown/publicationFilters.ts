import type { ListPostsParams } from '@/shared/api/generated/models/listPostsParams.dto';
import type { PublicCategoryDto } from '@/shared/api/generated/models/publicCategoryDto.dto';
import { z } from 'zod';

export type PublicationFilters = Pick<
  ListPostsParams,
  'createdFrom' | 'createdTo' | 'categoryId' | 'uncategorized'
>;
export type PublicationFilterResult =
  | { valid: true; filters: PublicationFilters; categoryName?: string }
  | { valid: false };

const instant = z.iso.datetime({ offset: true });
const filterKeys = ['createdFrom', 'createdTo', 'categoryId', 'uncategorized'] as const;

/** Compare instants without losing the sub-millisecond precision supported by the backend. */
function instantValue(value: string): bigint {
  const fraction = /\.(\d+)/.exec(value)?.[1] ?? '';
  const seconds = Date.parse(value.replace(/\.\d+/, ''));
  return BigInt(seconds) * BigInt(1_000_000) + BigInt(fraction.padEnd(9, '0'));
}

export function parsePublicationFilters(params: URLSearchParams): PublicationFilterResult {
  if (filterKeys.some((key) => params.getAll(key).length > 1)) return { valid: false };
  const filters: PublicationFilters = {};
  for (const key of ['createdFrom', 'createdTo'] as const) {
    const value = params.get(key);
    if (value !== null) {
      if (
        !instant.safeParse(value).success ||
        !Number.isFinite(Date.parse(value)) ||
        (/\.(\d+)/.exec(value)?.[1].length ?? 0) > 9
      )
        return { valid: false };
      filters[key] = value;
    }
  }
  if (
    filters.createdFrom &&
    filters.createdTo &&
    instantValue(filters.createdFrom) >= instantValue(filters.createdTo)
  )
    return { valid: false };
  const categoryId = params.get('categoryId');
  if (categoryId !== null) {
    if (
      !/^\d+$/.test(categoryId) ||
      !Number.isSafeInteger(Number(categoryId)) ||
      Number(categoryId) < 1
    )
      return { valid: false };
    filters.categoryId = Number(categoryId);
  }
  const uncategorized = params.get('uncategorized');
  if (uncategorized !== null && uncategorized !== 'true' && uncategorized !== 'false')
    return { valid: false };
  if (uncategorized === 'true') filters.uncategorized = true;
  if (
    (filters.uncategorized && filters.categoryId !== undefined) ||
    ((filters.uncategorized || filters.categoryId !== undefined) &&
      params.getAll('topic').some((value) => value.trim()))
  )
    return { valid: false };
  const categoryName =
    filters.categoryId === undefined ? undefined : params.get('categoryName')?.trim();
  return { valid: true, filters, ...(categoryName && { categoryName }) };
}
export function dayPublicationsHref(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return `/forum?${new URLSearchParams({ createdFrom: `${date}T00:00:00Z`, createdTo: `${next.toISOString().slice(0, 10)}T00:00:00Z` })}`;
}
export function categoryPublicationsHref(
  window: { windowStart: string; windowEnd: string },
  category: PublicCategoryDto | null
): string {
  const params = new URLSearchParams({
    createdFrom: window.windowStart,
    createdTo: window.windowEnd,
  });
  if (category) {
    params.set('categoryId', String(category.id));
    params.set('categoryName', category.name);
  } else params.set('uncategorized', 'true');
  return `/forum?${params}`;
}
export function clearPublicationFilters(
  params: URLSearchParams,
  part: 'dates' | 'category' | 'all'
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('page');
  if (part !== 'category') {
    next.delete('createdFrom');
    next.delete('createdTo');
  }
  if (part !== 'dates') {
    for (const key of ['categoryId', 'categoryName', 'uncategorized', 'topic']) next.delete(key);
  }
  return next;
}
