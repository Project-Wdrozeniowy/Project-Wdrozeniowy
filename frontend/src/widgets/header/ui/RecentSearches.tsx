import { SEARCH_RECENT_TITLE } from './searchBar.const';

interface RecentSearchesProps {
  terms: string[];
  onPick: (term: string) => void;
  onRemove: (term: string) => void;
}

/** The empty-state list of earlier terms; each can be repeated or removed. */
export default function RecentSearches({ terms, onPick, onRemove }: RecentSearchesProps) {
  return (
    <div role="group" aria-label={SEARCH_RECENT_TITLE}>
      <div
        aria-hidden="true"
        className="px-3 py-1 bg-slate-900/50 border-y border-slate-700 text-xs font-semibold uppercase tracking-wide text-slate-400"
      >
        {SEARCH_RECENT_TITLE}
      </div>
      <ul>
        {terms.map((term) => (
          <li key={term} className="flex items-center text-slate-200 hover:bg-slate-700/60">
            <button
              type="button"
              onClick={() => onPick(term)}
              className="flex-1 min-w-0 truncate text-left text-sm px-3 py-2 focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              {term}
            </button>
            <button
              type="button"
              aria-label={`Remove ${term} from recent searches`}
              onClick={() => onRemove(term)}
              className="px-3 py-2 text-slate-400 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
