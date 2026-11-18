import { tagHref } from '../tagUrl';

describe('tagHref', () => {
  it('points at the forum feed filtered by the tag', () => {
    expect(tagHref('spring-boot')).toBe('/forum?tag=spring-boot');
  });

  it('encodes characters that would break the URL', () => {
    expect(tagHref('c++ & more')).toBe('/forum?tag=c%2B%2B+%26+more');
  });
});
