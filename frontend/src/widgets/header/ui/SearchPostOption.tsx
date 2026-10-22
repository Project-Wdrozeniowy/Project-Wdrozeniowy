import { cn } from '@/shared/lib/cn';
import type { PostSummary } from '@/shared/api/forum/post.dto';

interface SearchPostOptionProps {
  id: string;
  post: PostSummary;
  active: boolean;
  onSelect: (post: PostSummary) => void;
}

/** A post in the dropdown: the only kind with a page to open, so the only selectable one. */
export default function SearchPostOption({ id, post, active, onSelect }: SearchPostOptionProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onClick={() => onSelect(post)}
      className={cn(
        'flex items-center gap-3 px-3 py-2 cursor-pointer',
        active ? 'bg-blue-600/20 text-blue-300' : 'text-slate-200 hover:bg-slate-700/60'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{post.title}</span>
        <span className="block truncate text-xs text-slate-400">
          {post.category?.name ?? 'No category'} · @{post.author.username}
        </span>
      </span>
      {active && (
        <span aria-hidden="true" className="text-xs text-blue-300 shrink-0">
          ↵
        </span>
      )}
    </div>
  );
}
