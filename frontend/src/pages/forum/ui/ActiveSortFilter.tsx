import { Link } from 'react-router';
import { FEED_SORT_CLEAR_LABEL } from '@/shared/constants/feedSort.const';

interface ActiveSortFilterProps {
  /** What the order is, in words ("The newest posts first"). */
  description: string;
  /** The feed without the order, keeping the rest of the filters. */
  clearHref: string;
}

/** Says the feed has an order picked on the home page, and offers the way back to the usual one. */
export default function ActiveSortFilter({ description, clearHref }: ActiveSortFilterProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <p className="text-fg-muted text-sm">
        Order: <span className="font-semibold text-accent">{description}</span>
      </p>
      <Link
        to={clearHref}
        className="text-sm font-semibold text-fg-muted hover:text-fg underline focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        {FEED_SORT_CLEAR_LABEL}
      </Link>
    </div>
  );
}
