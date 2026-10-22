import Link from 'next/link';

interface ActiveTagFilterProps {
  tag: string;
  /** The feed without the tag, keeping the rest of the filters. */
  clearHref: string;
}

/** Says the feed is limited to one tag and offers the way back to all posts. */
export default function ActiveTagFilter({ tag, clearHref }: ActiveTagFilterProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <p className="text-slate-300 text-sm">
        Posts tagged <span className="font-semibold text-blue-400 break-all">#{tag}</span>
      </p>
      <Link
        href={clearHref}
        className="text-sm font-semibold text-slate-300 hover:text-white underline focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        Show all posts
      </Link>
    </div>
  );
}
