import Link from 'next/link';
import type { PostCardTag } from '@/app/(main)/_lib/postCard';
import { tagHref } from '@/shared/lib/tagUrl';

interface PostTagLinksProps {
  tags: PostCardTag[];
}

/** The tags of a post, each a link to the feed of that tag. Renders nothing without tags. */
export default function PostTagLinks({ tags }: PostTagLinksProps) {
  if (tags.length === 0) return null;
  return (
    <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag.slug}>
          <Link
            href={tagHref(tag.slug)}
            className="inline-block bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium px-2 py-0.5 rounded focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            #{tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
