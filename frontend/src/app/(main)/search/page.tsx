import { Suspense } from 'react';
import SearchResults from './_ui/SearchResults';
import { SEARCH_PAGE_LOADING, SEARCH_PAGE_TITLE } from './_lib/searchPage.const';

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-gray-50 font-bold text-2xl">{SEARCH_PAGE_TITLE}</h1>
      {/* useSearchParams in SearchResults needs a Suspense boundary for static rendering */}
      <Suspense fallback={<p className="text-slate-400 text-sm">{SEARCH_PAGE_LOADING}</p>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
