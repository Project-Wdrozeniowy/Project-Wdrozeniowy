import { describe, expect, it } from 'vitest';
import {
  categoryPublicationsHref,
  clearPublicationFilters,
  dayPublicationsHref,
  parsePublicationFilters,
} from '../publicationFilters';

const from = '2020-02-29T00:00:00Z';
const to = '2020-03-01T00:00:00Z';
const category = { id: 42, name: 'Science & Tech', slug: 'science-tech', visible: false };
const parse = (query: string) => parsePublicationFilters(new URLSearchParams(query));

describe('publication filters', () => {
  it('links a leap day using UTC regardless of the reader time zone', () => {
    const url = new URL(dayPublicationsHref('2020-02-29'), 'https://orbita.example');
    expect(url.pathname).toBe('/forum');
    expect(Object.fromEntries(url.searchParams)).toEqual({ createdFrom: from, createdTo: to });
  });

  it.each([
    ['2026-12-31', '2027-01-01'],
    ['2026-02-28', '2026-03-01'],
  ])('links %s through the exclusive next day %s', (day, next) => {
    expect(
      new URL(dayPublicationsHref(day), 'https://orbita.example').searchParams.get('createdTo')
    ).toBe(`${next}T00:00:00Z`);
  });

  it('uses the exact displayed window and stable category identity', () => {
    const window = { windowStart: from, windowEnd: to };
    const url = new URL(categoryPublicationsHref(window, category), 'https://orbita.example');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      createdFrom: from,
      createdTo: to,
      categoryId: '42',
      categoryName: 'Science & Tech',
    });
    expect(parsePublicationFilters(url.searchParams)).toEqual({
      valid: true,
      filters: { createdFrom: from, createdTo: to, categoryId: 42 },
      categoryName: 'Science & Tech',
    });
  });

  it('keeps uncategorized separate from a category and a missing filter', () => {
    const url = new URL(
      categoryPublicationsHref({ windowStart: from, windowEnd: to }, null),
      'https://orbita.example'
    );
    expect(parsePublicationFilters(url.searchParams)).toEqual({
      valid: true,
      filters: { createdFrom: from, createdTo: to, uncategorized: true },
    });
    expect(parse('uncategorized=false')).toEqual({ valid: true, filters: {} });
    expect(parse('tag=java&sort=new')).toEqual({ valid: true, filters: {} });
  });

  it('accepts open bounds, offsets and nanosecond precision without rewriting instants', () => {
    const value = '2020-02-29T12:00:00.123456789+02:00';
    expect(parse(new URLSearchParams({ createdFrom: value }).toString())).toEqual({
      valid: true,
      filters: { createdFrom: value },
    });
    expect(parse(new URLSearchParams({ createdTo: to }).toString())).toEqual({
      valid: true,
      filters: { createdTo: to },
    });
    expect(
      parse('createdFrom=2020-02-29T00:00:00.000001Z&createdTo=2020-02-29T00:00:00.000002Z').valid
    ).toBe(true);
  });

  it.each([
    'createdFrom=2020-02-30T00:00:00Z',
    'createdFrom=2020-02-29',
    'createdFrom=yesterday',
    'createdTo=2020-02-29T00:00:00',
    'createdFrom=',
    'createdTo=2020-02-29T00:00:00%2B25:00',
    'createdFrom=2020-02-29T00:00:00.1234567890Z',
    `createdFrom=${to}&createdTo=${from}`,
    `createdFrom=${from}&createdTo=${from}`,
    'createdFrom=2020-02-29T00:00:00.000002Z&createdTo=2020-02-29T00:00:00.000001Z',
    'categoryId=0',
    'categoryId=-1',
    'categoryId=1.5',
    'categoryId=9007199254740992',
    'categoryId=no',
    'categoryId=',
    'uncategorized=maybe',
    'uncategorized=',
    'uncategorized=true&categoryId=42',
    'uncategorized=true&topic=Gaming',
    'categoryId=42&topic=Gaming',
    'categoryId=42&categoryId=43',
    `createdFrom=${from}&createdFrom=${to}`,
    'uncategorized=true&uncategorized=false',
  ])('rejects ambiguous or malformed input: %s', (query) => {
    expect(parse(query)).toEqual({ valid: false });
  });

  it('treats a source label only as optional text, never as a filter', () => {
    expect(parse('categoryName=Gaming')).toEqual({ valid: true, filters: {} });
    expect(parse('categoryId=42&categoryName=')).toEqual({
      valid: true,
      filters: { categoryId: 42 },
    });
    expect(parse('categoryId=42&categoryName=%3Cscript%3E')).toEqual({
      valid: true,
      filters: { categoryId: 42 },
      categoryName: '<script>',
    });
  });

  it.each(['dates', 'category', 'all'] as const)(
    'clears %s, resetting the page and retaining independent filters',
    (part) => {
      const original = new URLSearchParams({
        createdFrom: from,
        createdTo: to,
        categoryId: '42',
        categoryName: 'Old',
        page: '2',
        tag: 'java',
        sort: 'new',
      });
      const result = clearPublicationFilters(original, part);
      expect(result.get('page')).toBeNull();
      expect(result.get('tag')).toBe('java');
      expect(result.get('sort')).toBe('new');
      expect(result.get('createdFrom')).toBe(part === 'category' ? from : null);
      expect(result.get('categoryId')).toBe(part === 'dates' ? '42' : null);
      expect(result.get('categoryName')).toBe(part === 'dates' ? 'Old' : null);
      expect(original.get('page')).toBe('2');
    }
  );

  it('also clears topic and uncategorized when replacing a category', () => {
    expect(
      clearPublicationFilters(
        new URLSearchParams('topic=Gaming&uncategorized=true'),
        'category'
      ).toString()
    ).toBe('');
  });
});
