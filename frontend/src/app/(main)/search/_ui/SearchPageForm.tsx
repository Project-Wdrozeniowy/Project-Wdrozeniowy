'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { searchPageHref } from '@/shared/lib/searchUrl';
import { SEARCH_MAX_LENGTH } from '@/shared/api/search/searchQuery.const';
import { isSearchableTerm } from '@/shared/api/search/useSearch';
import type { SearchType } from '@/shared/api/search/search.dto';
import {
  SEARCH_PAGE_INPUT_ID,
  SEARCH_PAGE_INPUT_LABEL,
  SEARCH_PAGE_PLACEHOLDER,
  SEARCH_PAGE_SUBMIT_LABEL,
} from '../_lib/searchPage.const';

interface SearchPageFormProps {
  /** The term in the URL; the form starts from it. */
  term: string;
  type: SearchType | undefined;
}

export default function SearchPageForm({ term, type }: SearchPageFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(term);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (isSearchableTerm(trimmed)) router.push(searchPageHref({ q: trimmed, type }));
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex gap-2">
      <label htmlFor={SEARCH_PAGE_INPUT_ID} className="sr-only">
        {SEARCH_PAGE_INPUT_LABEL}
      </label>
      <input
        id={SEARCH_PAGE_INPUT_ID}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder={SEARCH_PAGE_PLACEHOLDER}
        autoComplete="off"
        className="flex-1 min-w-0 bg-slate-800 text-gray-50 placeholder-slate-400 rounded-lg px-4 py-2 text-sm border border-slate-700 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30"
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        {SEARCH_PAGE_SUBMIT_LABEL}
      </button>
    </form>
  );
}
