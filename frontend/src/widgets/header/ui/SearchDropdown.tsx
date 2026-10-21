import Link from 'next/link';
import { searchPageHref } from '@/shared/lib/searchUrl';
import type { PostSummary } from '@/shared/api/forum/post.dto';
import type { SearchResults } from '@/shared/api/search/search.dto';
import RecentSearches from './RecentSearches';
import SearchMessage from './SearchMessage';
import SearchPostOption from './SearchPostOption';
import SearchSection from './SearchSection';
import SearchTagRow from './SearchTagRow';
import SearchUserRow from './SearchUserRow';
import {
  SEARCH_ERROR_HINT,
  SEARCH_ERROR_TITLE,
  SEARCH_HINT_MIN_LENGTH,
  SEARCH_LISTBOX_ID,
  SEARCH_LOADING_LABEL,
  SEARCH_NO_RESULTS_HINT,
  SEARCH_NO_RESULTS_TITLE,
  SEARCH_RETRY_LABEL,
  SEARCH_SECTION_POSTS,
  SEARCH_SECTION_TAGS,
  SEARCH_SECTION_USERS,
  SEARCH_VIEW_ALL_LABEL,
} from './searchBar.const';

export type SearchDropdownView =
  | { kind: 'recent'; terms: string[] }
  | { kind: 'hint' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'results'; results: SearchResults };

interface SearchDropdownProps {
  view: SearchDropdownView;
  /** The trimmed term, for the "view all" link. */
  term: string;
  activeIndex: number;
  optionId: (index: number) => string;
  onSelectPost: (post: PostSummary) => void;
  onViewAll: () => void;
  onPickRecent: (term: string) => void;
  onRemoveRecent: (term: string) => void;
  onRetry: () => void;
}

/** The panel under the header search: one of its states, never the data of an older term. */
export default function SearchDropdown({
  view,
  term,
  activeIndex,
  optionId,
  onSelectPost,
  onViewAll,
  onPickRecent,
  onRemoveRecent,
  onRetry,
}: SearchDropdownProps) {
  return (
    <div
      // Keeps the focus in the input when a row or button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      {view.kind === 'recent' &&
        (view.terms.length > 0 ? (
          <RecentSearches terms={view.terms} onPick={onPickRecent} onRemove={onRemoveRecent} />
        ) : (
          <SearchMessage title="Search Orbita" hint={SEARCH_HINT_MIN_LENGTH} />
        ))}
      {view.kind === 'hint' && <SearchMessage title="Keep typing" hint={SEARCH_HINT_MIN_LENGTH} />}
      {view.kind === 'loading' && (
        <p role="status" className="px-4 py-6 text-center text-sm text-slate-400">
          {SEARCH_LOADING_LABEL}
        </p>
      )}
      {view.kind === 'error' && (
        <SearchMessage
          role="alert"
          title={SEARCH_ERROR_TITLE}
          hint={SEARCH_ERROR_HINT}
          action={
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 rounded border border-red-400/60 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              {SEARCH_RETRY_LABEL}
            </button>
          }
        />
      )}
      {view.kind === 'results' && (
        <Results
          results={view.results}
          term={term}
          activeIndex={activeIndex}
          optionId={optionId}
          onSelectPost={onSelectPost}
          onViewAll={onViewAll}
        />
      )}
    </div>
  );
}

interface ResultsProps {
  results: SearchResults;
  term: string;
  activeIndex: number;
  optionId: (index: number) => string;
  onSelectPost: (post: PostSummary) => void;
  onViewAll: () => void;
}

function Results({ results, term, activeIndex, optionId, onSelectPost, onViewAll }: ResultsProps) {
  const posts = results.posts?.content ?? [];
  const users = results.users?.content ?? [];
  const tags = results.tags?.content ?? [];

  if (posts.length + users.length + tags.length === 0) {
    return <SearchMessage title={SEARCH_NO_RESULTS_TITLE} hint={SEARCH_NO_RESULTS_HINT} />;
  }

  return (
    <>
      {posts.length > 0 && (
        <SearchSection title={SEARCH_SECTION_POSTS}>
          <div role="listbox" id={SEARCH_LISTBOX_ID} aria-label={SEARCH_SECTION_POSTS}>
            {posts.map((post, index) => (
              <SearchPostOption
                key={post.id}
                id={optionId(index)}
                post={post}
                active={index === activeIndex}
                onSelect={onSelectPost}
              />
            ))}
          </div>
        </SearchSection>
      )}
      {users.length > 0 && (
        <SearchSection title={SEARCH_SECTION_USERS}>
          {users.map((user) => (
            <SearchUserRow key={user.id} user={user} />
          ))}
        </SearchSection>
      )}
      {tags.length > 0 && (
        <SearchSection title={SEARCH_SECTION_TAGS}>
          {tags.map((tag) => (
            <SearchTagRow key={tag.id} tag={tag} />
          ))}
        </SearchSection>
      )}
      <Link
        href={searchPageHref({ q: term })}
        onClick={onViewAll}
        className="block border-t border-slate-700 px-3 py-2 text-center text-xs font-semibold text-blue-400 hover:bg-slate-700/60 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        {SEARCH_VIEW_ALL_LABEL}
      </Link>
    </>
  );
}
