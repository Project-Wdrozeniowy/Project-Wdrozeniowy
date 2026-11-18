import { Link } from 'react-router';
import { tagHref } from '@/shared/lib/tagUrl';
import type { TagDto as Tag } from '@/shared/api/generated/models/tagDto.dto';

interface SearchTagRowProps {
  tag: Tag;
  /** Called when the link is followed, so the panel can close. */
  onNavigate: () => void;
}

/** A tag in the dropdown: a link to the feed of that tag. */
export default function SearchTagRow({ tag, onNavigate }: SearchTagRowProps) {
  return (
    <Link
      to={tagHref(tag.slug)}
      onClick={onNavigate}
      className="flex items-center gap-3 px-3 py-2 text-fg-soft hover:bg-raised/60 focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      <span
        aria-hidden="true"
        className="w-8 h-8 rounded-full bg-raised flex items-center justify-center text-fg-muted text-sm"
      >
        #
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{tag.name}</span>
      <span className="text-xs text-fg-subtle shrink-0">{tag.postCount}</span>
    </Link>
  );
}
