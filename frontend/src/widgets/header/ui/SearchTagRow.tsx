import type { Tag } from '@/shared/api/forum/tag.dto';

/** A tag in the dropdown. There is no tag page yet, so the row is not a link. */
export default function SearchTagRow({ tag }: { tag: Tag }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-slate-200">
      <span
        aria-hidden="true"
        className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm"
      >
        #
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{tag.name}</span>
      <span className="text-xs text-slate-400 shrink-0">{tag.postCount}</span>
    </div>
  );
}
