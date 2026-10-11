import { ALL_TOPICS } from '@/constants/categories';

interface EmptyFeedProps {
  topic: string;
  /** The page number is past the last page although posts exist. */
  pageOutOfRange: boolean;
  onFirstPage: () => void;
}

export default function EmptyFeed({ topic, pageOutOfRange, onFirstPage }: EmptyFeedProps) {
  if (pageOutOfRange) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-slate-400 text-sm">This page does not exist.</p>
        <button
          type="button"
          onClick={onFirstPage}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
        >
          Go to the first page
        </button>
      </div>
    );
  }
  return (
    <p className="text-slate-400 text-sm">
      {topic === ALL_TOPICS ? 'No posts yet.' : 'No posts in this topic yet.'}
    </p>
  );
}
