import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { PostSummaryDto } from '@/shared/api/generated/models/postSummaryDto.dto';
import { postHref } from '@/shared/lib/searchUrl';
import CategoryChip from '@/shared/ui/CategoryChip';
import { ChevronUpVoteIcon, CommentIcon, EyeIcon } from '@/shared/ui/icons';

interface TopPostRowProps {
  rank: number;
  post: PostSummaryDto;
}

interface TotalProps {
  icon: ReactNode;
  count: number;
  /** What the number counts, said to assistive technology after it. */
  label: string;
}

function Total({ icon, count, label }: TotalProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden="true" className="inline-flex scale-75">
        {icon}
      </span>
      {count.toLocaleString('en-US')}
      <span className="sr-only"> {label} </span>
    </span>
  );
}

/**
 * One ranked post: its place, its title as the link to its page, its category, and its totals over
 * all time. The ranking score is not published, so none is shown, and these totals are not it.
 */
export default function TopPostRow({ rank, post }: TopPostRowProps) {
  return (
    <li className="bg-raised rounded-lg px-4 py-3 flex items-start gap-4">
      <span
        aria-hidden="true"
        className="bg-surface text-fg-subtle font-bold text-sm w-8 h-8 rounded-full border border-line flex items-center justify-center shrink-0"
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={postHref(post.slug)}
            className="text-fg font-semibold text-sm break-words line-clamp-2 hover:text-accent focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            {post.title}
          </Link>
          {post.category && <CategoryChip name={post.category.name} slug={post.category.slug} />}
        </div>
        <p className="text-fg-subtle text-xs flex items-center gap-3 flex-wrap">
          <span className="sr-only">Totals over all time: </span>
          <Total icon={<EyeIcon />} count={post.viewCount} label="views" />
          <Total icon={<ChevronUpVoteIcon />} count={post.voteScore} label="vote score" />
          <Total icon={<CommentIcon />} count={post.commentCount} label="comments" />
        </p>
      </div>
    </li>
  );
}
