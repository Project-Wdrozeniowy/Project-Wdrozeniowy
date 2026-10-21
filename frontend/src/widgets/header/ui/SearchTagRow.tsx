import Link from 'next/link';
import { tagHref } from '@/shared/lib/tagUrl';
import type { Tag } from '@/shared/api/forum/tag.dto';

interface SearchTagRowProps {
  tag: Tag;
  /** Called when the link is followed, so the panel can close. */
  onNavigate: () => void;
}

/** A tag in the dropdown: a link to the feed of that tag. */
export default function SearchTagRow({ tag, onNavigate }: SearchTagRowProps) {
  return (
    <Link
      href={tagHref(tag.slug)}
      onClick={onNavigate}
      className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-slate-700/60 focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      <span
        aria-hidden="true"
        className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm"
      >
        #
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{tag.name}</span>
      <span className="text-xs text-slate-400 shrink-0">{tag.postCount}</span>
    </Link>
  );
}
