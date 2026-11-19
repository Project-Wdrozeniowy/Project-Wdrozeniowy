import { FEED_ERROR_MESSAGE } from '@/widgets/post-feed/config/feed.const';
import ErrorCard from '@/shared/ui/ErrorCard';

interface PostFeedErrorProps {
  onRetry: () => unknown;
  /** A retry is in flight: the button shows it and ignores further activations. */
  retrying?: boolean;
}

/** Recoverable feed failure. Never shows server details; the user can retry. */
export default function PostFeedError({ onRetry, retrying = false }: PostFeedErrorProps) {
  return (
    <ErrorCard message={FEED_ERROR_MESSAGE} onRetry={onRetry} retrying={retrying} className="p-5" />
  );
}
