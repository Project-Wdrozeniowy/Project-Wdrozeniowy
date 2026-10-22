import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import { searchPageHref } from '@/shared/lib/searchUrl';
import type { SearchType } from '@/shared/api/search/search.dto';
import { SEARCH_TABS } from '../_lib/searchPage.const';

interface SearchTabsProps {
  term: string;
  active: SearchType | undefined;
}

/** All / Posts / Users / Tags. A tab is a link, so the kind is in the URL and survives a reload. */
export default function SearchTabs({ term, active }: SearchTabsProps) {
  return (
    <nav aria-label="Result kinds" className="flex border-b border-slate-700">
      {SEARCH_TABS.map((tab) => {
        const current = tab.type === active;
        return (
          <Link
            key={tab.label}
            href={searchPageHref({ q: term, type: tab.type })}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 focus-visible:outline-2 focus-visible:outline-blue-500',
              current
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
