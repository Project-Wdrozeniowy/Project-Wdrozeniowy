'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import type { ChangeEvent, FocusEvent, FormEvent, KeyboardEvent } from 'react';
import { postHref, searchPageHref } from '@/shared/lib/searchUrl';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { useRecentSearches } from '@/shared/lib/useRecentSearches';
import { isSearchableTerm, useSearchPreview } from '@/shared/api/search/useSearch';
import { SEARCH_DEBOUNCE_MS, SEARCH_MAX_LENGTH } from '@/shared/api/search/searchQuery.const';
import type { PostSummary } from '@/shared/api/forum/post.dto';
import { SearchIcon } from '@/shared/ui/icons';
import SearchDropdown from './SearchDropdown';
import type { SearchDropdownView } from './SearchDropdown';
import {
  SEARCH_INPUT_ID,
  SEARCH_LABEL,
  SEARCH_LISTBOX_ID,
  SEARCH_PLACEHOLDER,
} from './searchBar.const';

/**
 * Header search: a combobox that previews the top matches while typing.
 * ArrowUp/ArrowDown move through the posts, Enter opens the highlighted post (or, with nothing
 * highlighted, the results page), Escape closes the panel and, once closed, clears the input.
 */
export default function SearchBar() {
  const router = useRouter();
  const optionPrefix = useId();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const recent = useRecentSearches();

  const trimmed = value.trim();
  const term = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS);
  const searchable = isSearchableTerm(trimmed);
  const search = useSearchPreview(term);

  // The answer is only used once it belongs to what is in the input right now.
  const settled = term === trimmed;
  let view: SearchDropdownView;
  if (trimmed === '') view = { kind: 'recent', terms: recent.terms };
  else if (!searchable) view = { kind: 'hint' };
  else if (!settled || search.isPending || search.isFetching) view = { kind: 'loading' };
  else if (search.isError || !search.data) view = { kind: 'error' };
  else view = { kind: 'results', results: search.data };

  const posts = view.kind === 'results' ? (view.results.posts?.content ?? []) : [];
  const optionId = (index: number) => `${optionPrefix}-option-${index}`;
  const activeOption = activeIndex >= 0 && activeIndex < posts.length ? activeIndex : -1;

  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function openPost(post: PostSummary) {
    recent.add(trimmed);
    close();
    router.push(postHref(post.slug));
  }

  function openResultsPage(query: string) {
    recent.add(query);
    setValue(query);
    close();
    router.push(searchPageHref({ q: query }));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
    setActiveIndex(-1);
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchable) openResultsPage(trimmed);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (posts.length === 0) return;
      const last = posts.length - 1;
      if (event.key === 'ArrowDown') setActiveIndex(activeOption >= last ? 0 : activeOption + 1);
      else setActiveIndex(activeOption <= 0 ? last : activeOption - 1);
    } else if (event.key === 'Enter' && open && activeOption >= 0) {
      // A highlighted post wins over the form submit.
      event.preventDefault();
      openPost(posts[activeOption]);
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        close();
      } else if (value) {
        setValue('');
      }
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  }

  return (
    <>
      <Link
        href="/search"
        aria-label="Search"
        className="sm:hidden p-2 rounded text-slate-300 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <SearchIcon />
      </Link>
      <div className="relative hidden sm:block" onBlur={handleBlur}>
        <form role="search" onSubmit={handleSubmit}>
          <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
            {SEARCH_LABEL}
          </label>
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            id={SEARCH_INPUT_ID}
            type="text"
            role="combobox"
            aria-expanded={open && posts.length > 0}
            aria-controls={posts.length > 0 ? SEARCH_LISTBOX_ID : undefined}
            aria-autocomplete="list"
            aria-activedescendant={activeOption >= 0 ? optionId(activeOption) : undefined}
            autoComplete="off"
            maxLength={SEARCH_MAX_LENGTH}
            placeholder={SEARCH_PLACEHOLDER}
            value={value}
            onChange={handleChange}
            onFocus={() => {
              recent.refresh();
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="bg-slate-700 text-gray-50 placeholder-slate-400 rounded text-sm pl-9 pr-3 py-2 w-56 focus:w-72 transition-[width] focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 border border-transparent"
          />
        </form>
        {open && (
          <SearchDropdown
            view={view}
            term={trimmed}
            activeIndex={activeOption}
            optionId={optionId}
            onSelectPost={openPost}
            onViewAll={() => {
              recent.add(trimmed);
              close();
            }}
            onPickRecent={openResultsPage}
            onRemoveRecent={recent.remove}
            onRetry={() => void search.refetch()}
          />
        )}
      </div>
    </>
  );
}
