import { Link } from 'react-router';
import {
  BACK_TO_FORUM_LABEL,
  POST_NOT_FOUND_TEXT,
  POST_NOT_FOUND_TITLE,
} from '@/pages/post/config/post.const';

export default function PostNotFound() {
  return (
    <div className="bg-surface rounded-xl p-8 flex flex-col items-center gap-3 text-center border border-line">
      <h1 className="text-fg font-bold text-2xl">{POST_NOT_FOUND_TITLE}</h1>
      <p className="text-fg-muted text-sm">{POST_NOT_FOUND_TEXT}</p>
      <Link
        to="/forum"
        className="text-accent hover:text-accent-hover text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        {BACK_TO_FORUM_LABEL}
      </Link>
    </div>
  );
}
