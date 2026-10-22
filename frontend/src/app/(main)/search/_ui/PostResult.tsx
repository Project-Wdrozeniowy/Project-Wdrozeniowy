import Link from 'next/link';
import { postHref } from '@/shared/lib/searchUrl';
import type { PostSummary } from '@/shared/api/forum/post.dto';

interface PostResultProps {
  post: PostSummary;
}

export default function PostResult({ post }: PostResultProps) {
  return (
    <li>
      <Link
        href={postHref(post.slug)}
        className="flex flex-col gap-0.5 px-4 py-3 hover:bg-slate-700/50 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <span className="text-sm font-medium text-slate-100 break-words">{post.title}</span>
        <span className="text-xs text-slate-400">
          {post.category?.name ?? 'No category'} · @{post.author.username} · {post.commentCount}{' '}
          {post.commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </Link>
    </li>
  );
}
