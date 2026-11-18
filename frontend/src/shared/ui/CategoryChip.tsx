import { Link } from 'react-router';
import { getCategoryColor } from '@/shared/lib/categoryColor';
import { cn } from '@/shared/lib/cn';

interface CategoryChipProps {
  name: string;
  slug?: string | null;
  /** Makes the chip a link, e.g. to the feed of the category. */
  href?: string;
}

/** The coloured label of a post's category, the same in the feed and on the post page. */
export default function CategoryChip({ name, slug, href }: CategoryChipProps) {
  const className = cn(
    'text-xs font-semibold px-2 py-0.5 rounded border self-start',
    getCategoryColor({ name, slug })
  );
  return href ? (
    <Link
      to={href}
      className={cn(className, 'focus-visible:outline-2 focus-visible:outline-blue-500')}
    >
      {name}
    </Link>
  ) : (
    <span className={className}>{name}</span>
  );
}
