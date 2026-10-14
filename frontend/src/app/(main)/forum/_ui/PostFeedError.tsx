import { FEED_ERROR_MESSAGE } from '@/app/(main)/forum/_ui/forumFeed.const';

interface PostFeedErrorProps {
  onRetry: () => void;
  /** A retry is in flight: the button shows it and ignores further clicks. */
  retrying?: boolean;
}

/** Recoverable feed failure. Never shows server details; the user can retry. */
export default function PostFeedError({ onRetry, retrying = false }: PostFeedErrorProps) {
  return (
    <div role="alert" className="bg-slate-800 rounded-xl p-5 flex flex-col items-start gap-3">
      <p className="text-slate-200 text-sm">{FEED_ERROR_MESSAGE}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {retrying ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  );
}
