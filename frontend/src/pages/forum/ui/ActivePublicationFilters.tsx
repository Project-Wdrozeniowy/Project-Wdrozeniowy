import { Link } from 'react-router';
import { useListCategories } from '@/shared/api/generated/orbita.api';
import type { PostSummaryDto } from '@/shared/api/generated/models/postSummaryDto.dto';
import { clearPublicationFilters, parsePublicationFilters } from '@/features/publication-drilldown';

interface ActivePublicationFiltersProps {
  params: URLSearchParams;
  posts: PostSummaryDto[];
}

const linkClass =
  'underline font-semibold rounded focus-visible:outline-2 focus-visible:outline-blue-500';
const utcFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

/** Keep sub-second bounds visible instead of rounding a narrow range to two identical labels. */
function boundLabel(value: string) {
  const fraction = /\.(\d+)/.exec(value)?.[1];
  return `${utcFormat.format(new Date(value))}${fraction ? `.${fraction}` : ''} UTC`;
}

export default function ActivePublicationFilters({ params, posts }: ActivePublicationFiltersProps) {
  const parsed = parsePublicationFilters(params);
  const categoryId = parsed.valid ? parsed.filters.categoryId : undefined;
  const categories = useListCategories({
    query: { enabled: categoryId !== undefined, retry: false, staleTime: 60_000 },
    request: { skipErrorToast: true },
  });
  const href = (part: 'dates' | 'category' | 'all') => {
    const query = clearPublicationFilters(params, part).toString();
    return query ? `/forum?${query}` : '/forum';
  };
  if (!parsed.valid)
    return (
      <div role="alert" className="rounded-lg border border-line p-3 text-sm text-fg space-y-2">
        <p>
          This publication filter is invalid. Check the date bounds and choose only one category
          filter.
        </p>
        <Link to={href('all')} className={linkClass}>
          Clear publication filters
        </Link>
      </div>
    );
  const { filters, categoryName } = parsed;
  const hasDates = !!(filters.createdFrom || filters.createdTo);
  const hasCategory = categoryId !== undefined || filters.uncategorized;
  if (!hasDates && !hasCategory) return null;
  const currentCategory =
    categories.data?.find((category) => category.id === categoryId) ??
    posts.find((post) => post.category?.id === categoryId)?.category;
  const label =
    currentCategory?.name ??
    (categoryName ? `${categoryName} (name from analytics)` : `Category #${categoryId}`);
  return (
    <section
      aria-label="Publication filters"
      className="rounded-lg border border-line p-3 text-sm text-fg space-y-2 wrap-anywhere"
    >
      {hasDates && (
        <div className="flex gap-3 flex-wrap">
          <p>
            Created{' '}
            {filters.createdFrom ? `from ${boundLabel(filters.createdFrom)} (inclusive)` : ''}
            {filters.createdFrom && filters.createdTo ? ' ' : ''}
            {filters.createdTo ? `before ${boundLabel(filters.createdTo)} (exclusive)` : ''}
          </p>
          <Link to={href('dates')} className={linkClass}>
            Clear dates
          </Link>
        </div>
      )}
      {hasCategory && (
        <div className="flex gap-3 flex-wrap">
          <p>Category: {filters.uncategorized ? 'No category' : label}</p>
          <Link to={href('category')} className={linkClass}>
            Clear category
          </Link>
        </div>
      )}
      <p className="text-fg-subtle">
        Results include posts that are currently public. New posts, visibility or category changes
        can change the count since the analytics was read.
      </p>
      <Link to={href('all')} className={linkClass}>
        Clear publication filters
      </Link>
    </section>
  );
}
