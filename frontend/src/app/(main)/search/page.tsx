import SearchResults from './_ui/SearchResults';
import { SEARCH_PAGE_TITLE } from './_lib/searchPage.const';

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-gray-50 font-bold text-2xl">{SEARCH_PAGE_TITLE}</h1>
      <SearchResults />
    </div>
  );
}
