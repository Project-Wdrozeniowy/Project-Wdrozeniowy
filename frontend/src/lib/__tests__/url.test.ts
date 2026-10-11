import { isHttpUrl } from '../url';

describe('isHttpUrl', () => {
  it.each(['http://example.com/a.png', 'https://example.com/a.png?x=1', 'HTTPS://EXAMPLE.COM'])(
    'accepts %s',
    (value) => {
      expect(isHttpUrl(value)).toBe(true);
    }
  );

  it.each([
    '',
    'not a url',
    'example.com/a.png',
    '//example.com/a.png',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'ftp://example.com/a.png',
    'file:///etc/passwd',
  ])('rejects %s', (value) => {
    expect(isHttpUrl(value)).toBe(false);
  });
});
