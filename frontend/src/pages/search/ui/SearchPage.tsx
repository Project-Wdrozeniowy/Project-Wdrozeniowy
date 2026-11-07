import SearchResults from './SearchResults';
import { SEARCH_PAGE_TITLE } from '@/pages/search/config/searchPage.const';

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-gray-50 font-bold text-2xl">{SEARCH_PAGE_TITLE}</h1>
      <SearchResults />
    </div>
  );
}
