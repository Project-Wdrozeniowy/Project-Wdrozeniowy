import { Link } from 'react-router';
import { postHref } from '@/shared/lib/searchUrl';
import type { PostSummaryDto as PostSummary } from '@/shared/api/generated/models/postSummaryDto.dto';

interface PostResultProps {
  post: PostSummary;
}

export default function PostResult({ post }: PostResultProps) {
  return (
    <li>
      <Link
        to={postHref(post.slug)}
        className="flex flex-col gap-0.5 px-4 py-3 hover:bg-raised/50 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <span className="text-sm font-medium text-fg break-words">{post.title}</span>
        <span className="text-xs text-fg-subtle">
          {post.category?.name ?? 'No category'} · @{post.author.username} · {post.commentCount}{' '}
          {post.commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </Link>
    </li>
  );
}
