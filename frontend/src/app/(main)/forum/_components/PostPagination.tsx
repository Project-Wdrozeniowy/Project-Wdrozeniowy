interface PostPaginationProps {
  /** 0-based, like the API. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const BUTTON_CLASS =
  'px-3 py-1.5 rounded text-sm font-semibold transition-colors bg-slate-800 text-gray-50 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-800';

export default function PostPagination({ page, totalPages, onPageChange }: PostPaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrevious = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrevious}
        className={BUTTON_CLASS}
      >
        Previous
      </button>
      <span aria-live="polite" className="text-slate-300 text-sm">
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        className={BUTTON_CLASS}
      >
        Next
      </button>
    </nav>
  );
}
