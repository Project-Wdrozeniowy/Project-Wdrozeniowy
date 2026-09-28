import { SearchIcon } from '@/components/ui/icons';

export default function SearchBar() {
  return (
    <div className="relative hidden sm:block">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <SearchIcon />
      </div>
      <input
        type="search"
        aria-label="Search posts"
        placeholder="Search posts..."
        className="bg-slate-700 text-gray-50 placeholder-slate-400 rounded text-sm pl-9 pr-3 py-2 w-56 focus:outline-none focus:ring-1 focus:ring-blue-600"
      />
    </div>
  );
}
