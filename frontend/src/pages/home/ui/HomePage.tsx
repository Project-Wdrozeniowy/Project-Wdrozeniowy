import { Link, useSearchParams } from 'react-router';
import { CreatePostButton } from '@/features/create-post/CreatePostButton';
import {
  DEFAULT_FEED_SORT,
  FEED_SORTS,
  FEED_SORT_LABEL,
  FEED_SORT_PARAM,
  FEED_SORT_UNAVAILABLE_LABEL,
} from '@/shared/constants/feedSort.const';
import { cn } from '@/shared/lib/cn';
import { feedSortHref, parseFeedSort } from '@/shared/lib/feedSort';
import HomeFeed from './HomeFeed';

const TAB_CLASS = 'block px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors';

/**
 * The home page: the first posts of the feed in the order the user picked (new by default; hot is
 * shown and not open, see `feedSort.const.ts`). The order is in the address (`/?sort=top`), so a
 * reload and a shared link keep it; picking one replaces the entry instead of adding one, so Back
 * leaves the page and does not walk through the tabs.
 */
export default function HomePage() {
  const [searchParams] = useSearchParams();
  const sort = parseFeedSort(searchParams.get(FEED_SORT_PARAM));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={FEED_SORT_LABEL}>
          <ul className="flex items-center bg-raised rounded-xl p-1 gap-1 list-none m-0">
            {FEED_SORTS.map((option) => (
              <li key={option.id}>
                {option.available ? (
                  <Link
                    to={option.id === DEFAULT_FEED_SORT ? '/' : feedSortHref('/', option.id)}
                    replace
                    preventScrollReset
                    title={option.description}
                    aria-current={option.id === sort ? 'page' : undefined}
                    className={cn(
                      TAB_CLASS,
                      'focus-visible:outline-2 focus-visible:outline-blue-500',
                      option.id === sort ? 'bg-surface text-fg' : 'text-fg hover:bg-raised-hover'
                    )}
                  >
                    {option.label}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    title={option.description}
                    className={cn(TAB_CLASS, 'text-fg-subtle opacity-70 cursor-not-allowed')}
                  >
                    {option.label}
                    <span className="sr-only"> ({FEED_SORT_UNAVAILABLE_LABEL})</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <CreatePostButton />
      </div>

      <HomeFeed sort={sort} />
    </div>
  );
}
