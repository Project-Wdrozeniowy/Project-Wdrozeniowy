import Link from 'next/link';
import { tagHref } from '@/shared/lib/tagUrl';
import type { Tag } from '@/shared/api/forum/tag.dto';

interface TagResultProps {
  tag: Tag;
}

/** A tag result: a link to the feed of that tag. */
export default function TagResult({ tag }: TagResultProps) {
  return (
    <li>
      <Link
        href={tagHref(tag.slug)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <span
          aria-hidden="true"
          className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm shrink-0"
        >
          #
        </span>
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-100">
          {tag.name}
        </span>
        <span className="text-xs text-slate-400 shrink-0">
          {tag.postCount} {tag.postCount === 1 ? 'post' : 'posts'}
        </span>
      </Link>
    </li>
  );
}
