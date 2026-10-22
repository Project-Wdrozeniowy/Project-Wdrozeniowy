import { postHref, searchPageHref } from '../searchUrl';

describe('postHref', () => {
  it('encodes the slug', () => {
    expect(postHref('hello-world')).toBe('/forum/hello-world');
    expect(postHref('a/b c')).toBe('/forum/a%2Fb%20c');
  });
});

describe('searchPageHref', () => {
  it('encodes the term and leaves out defaults', () => {
    expect(searchPageHref({ q: 'c++ & rust' })).toBe('/search?q=c%2B%2B+%26+rust');
  });

  it('adds the kind and a page after the first', () => {
    expect(searchPageHref({ q: 'a1', type: 'POST', page: 3 })).toBe(
      '/search?q=a1&type=POST&page=3'
    );
    expect(searchPageHref({ q: 'a1', page: 1 })).toBe('/search?q=a1');
  });
});
