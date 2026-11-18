import { Link } from 'react-router';
import type { PostSummaryDto } from '@/shared/api/generated/models/postSummaryDto.dto';

interface TopPostRowProps {
  rank: number;
  post: PostSummaryDto;
}

export default function TopPostRow({ rank, post }: TopPostRowProps) {
  return (
    <li className="bg-raised rounded-lg px-4 py-3 flex items-center gap-4">
      <span aria-hidden="true" className="text-fg-subtle font-bold text-base w-5 shrink-0">
        #{rank}
      </span>
      <div className="flex-1 min-w-0">
        <Link
          to={`/forum/${encodeURIComponent(post.slug)}`}
          className="block text-fg font-semibold text-sm truncate hover:text-accent focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          {post.title}
        </Link>
        <p className="text-fg-subtle text-xs">
          {post.commentCount.toLocaleString('en-US')} comments ·{' '}
          {post.viewCount.toLocaleString('en-US')} views
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-fg font-semibold text-sm">{post.voteScore.toLocaleString('en-US')}</p>
        <p className="text-fg-subtle text-xs">score</p>
      </div>
    </li>
  );
}
