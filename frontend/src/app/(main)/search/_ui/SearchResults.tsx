'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { searchPageHref } from '@/shared/lib/searchUrl';
import { isSearchableTerm, useSearchPages } from '@/shared/api/search/useSearch';
import {
  collectItems,
  hasMorePages,
  parsePagesParam,
  parseSearchTerm,
  parseSearchType,
  totalMatches,
} from '../_lib/searchPage';
import {
  SEARCH_PAGE_EMPTY_HINT,
  SEARCH_PAGE_EMPTY_TITLE,
  SEARCH_PAGE_ERROR_HINT,
  SEARCH_PAGE_ERROR_TITLE,
  SEARCH_PAGE_HINT,
  SEARCH_PAGE_LOAD_MORE_LABEL,
  SEARCH_PAGE_LOADING,
  SEARCH_PAGE_LOADING_MORE_LABEL,
  SEARCH_PAGE_RETRY_LABEL,
} from '../_lib/searchPage.const';
import PostResult from './PostResult';
import ResultSection from './ResultSection';
import SearchNotice from './SearchNotice';
import SearchPageForm from './SearchPageForm';
import SearchTabs from './SearchTabs';
import TagResult from './TagResult';
import UserResult from './UserResult';

/**
 * Results of `GET /search`. The term (`q`), the kind (`type`) and how many pages are shown
 * (`page`, 1-based) live in the URL, so a result list can be linked, reloaded and used with Back.
 * "Load more" raises `page`; the pages already shown stay.
 */
export default function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const term = parseSearchTerm(searchParams.get('q'));
  const type = parseSearchType(searchParams.get('type'));
  const pages = parsePagesParam(searchParams.get('page'));
  const searchable = isSearchableTerm(term);

  const queries = useSearchPages({ term, type, pages });
  const first = queries[0];
  const last = queries[queries.length - 1];
  const results = queries.map((query) => query.data);
  const failed = queries.filter((query) => query.isError);

  function retry() {
    failed.forEach((query) => void query.refetch());
  }

  function loadMore() {
    router.replace(searchPageHref({ q: term, type, page: pages + 1 }), { scroll: false });
  }

  const retryButton = (
    <button
      type="button"
      onClick={retry}
      className="mt-1 rounded border border-red-400/60 px-3 py-1 text-sm font-semibold text-red-300 hover:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      {SEARCH_PAGE_RETRY_LABEL}
    </button>
  );

  let body;
  if (!searchable) {
    body = <SearchNotice hint={SEARCH_PAGE_HINT} />;
  } else if (first.isError) {
    body = (
      <SearchNotice
        role="alert"
        title={SEARCH_PAGE_ERROR_TITLE}
        hint={SEARCH_PAGE_ERROR_HINT}
        action={retryButton}
      />
    );
  } else if (!first.data) {
    body = <SearchNotice hint={SEARCH_PAGE_LOADING} />;
  } else if (totalMatches(first.data) === 0) {
    body = <SearchNotice title={SEARCH_PAGE_EMPTY_TITLE} hint={SEARCH_PAGE_EMPTY_HINT} />;
  } else {
    const posts = collectItems(results, 'posts');
    const users = collectItems(results, 'users');
    const tags = collectItems(results, 'tags');
    const total = totalMatches(first.data);
    body = (
      <>
        <p aria-live="polite" className="text-sm text-slate-400">
          {total} {total === 1 ? 'result' : 'results'} for “{term}”
        </p>
        {posts.length > 0 && (
          <ResultSection title="Posts">
            {posts.map((post) => (
              <PostResult key={post.id} post={post} />
            ))}
          </ResultSection>
        )}
        {users.length > 0 && (
          <ResultSection title="Users">
            {users.map((user) => (
              <UserResult key={user.id} user={user} />
            ))}
          </ResultSection>
        )}
        {tags.length > 0 && (
          <ResultSection title="Tags">
            {tags.map((tag) => (
              <TagResult key={tag.id} tag={tag} />
            ))}
          </ResultSection>
        )}
        {failed.length > 0 && (
          <SearchNotice
            role="alert"
            title={SEARCH_PAGE_ERROR_TITLE}
            hint={SEARCH_PAGE_ERROR_HINT}
            action={retryButton}
          />
        )}
        {failed.length === 0 && hasMorePages(last.data) && (
          <button
            type="button"
            onClick={loadMore}
            disabled={last.isFetching}
            className="self-center rounded border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            {last.isFetching ? SEARCH_PAGE_LOADING_MORE_LABEL : SEARCH_PAGE_LOAD_MORE_LABEL}
          </button>
        )}
        {failed.length === 0 && !last.data && (
          <p role="status" className="self-center text-sm text-slate-400">
            {SEARCH_PAGE_LOADING_MORE_LABEL}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      {/* key: the input starts from the URL again whenever the URL changes (Back, a tab, a link). */}
      <SearchPageForm key={searchParams.toString()} term={term} type={type} />
      {searchable && <SearchTabs term={term} active={type} />}
      {body}
    </>
  );
}
