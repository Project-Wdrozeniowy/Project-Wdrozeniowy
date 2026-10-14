interface PostPaginationProps {
  /** 0-based, like the API. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** The target page is loading: the buttons stay focusable but ignore clicks. */
  busy?: boolean;
}

const BUTTON_CLASS =
  'px-3 py-1.5 rounded text-sm font-semibold transition-colors bg-slate-800 text-gray-50 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-800 aria-disabled:opacity-60 aria-disabled:cursor-wait';

export default function PostPagination({
  page,
  totalPages,
  onPageChange,
  busy = false,
}: PostPaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrevious = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => !busy && onPageChange(page - 1)}
        disabled={!hasPrevious}
        // aria-disabled (not disabled) while busy: a disabled button would drop keyboard focus.
        aria-disabled={busy || undefined}
        className={BUTTON_CLASS}
      >
        Previous
      </button>
      <span aria-live="polite" className="text-slate-300 text-sm">
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => !busy && onPageChange(page + 1)}
        disabled={!hasNext}
        aria-disabled={busy || undefined}
        className={BUTTON_CLASS}
      >
        Next
      </button>
    </nav>
  );
}
