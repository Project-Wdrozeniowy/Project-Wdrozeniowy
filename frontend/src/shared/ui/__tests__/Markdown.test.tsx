import { render, screen, within } from '@testing-library/react';
import Markdown, { safeMarkdownUrl } from '@/shared/ui/Markdown';

/**
 * Markdown from a user is untrusted. Each payload below is a real attack or a real mistake, and
 * must come out as inert text or a safe element: nothing that runs, loads or navigates unexpectedly.
 */

function html(markdown: string) {
  const { container } = render(<Markdown>{markdown}</Markdown>);
  return container;
}

describe('what Markdown shows', () => {
  it('renders the formatting a post is written with', () => {
    const view = html(
      [
        '**bold** and *italic* and ~~gone~~ and `inline`',
        '',
        '- one',
        '- two',
        '',
        '1. first',
        '2. second',
        '',
        '> a quote',
        '',
        '```',
        'const a = 1;',
        '```',
      ].join('\n')
    );

    expect(view.querySelector('strong')).toHaveTextContent('bold');
    expect(view.querySelector('em')).toHaveTextContent('italic');
    expect(view.querySelector('del')).toHaveTextContent('gone');
    expect(view.querySelectorAll('ul li')).toHaveLength(2);
    expect(view.querySelectorAll('ol li')).toHaveLength(2);
    expect(view.querySelector('blockquote')).toHaveTextContent('a quote');
    expect(view.querySelector('pre code')).toHaveTextContent('const a = 1;');
  });

  it('renders a table inside a box that scrolls, so a wide one does not widen the page', () => {
    const view = html('| a | b |\n| - | - |\n| 1 | 2 |');

    const table = view.querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.parentElement).toHaveClass('overflow-x-auto');
    expect(within(view).getByRole('columnheader', { name: 'a' })).toBeInTheDocument();
  });

  it('keeps code in a box that scrolls, can be reached by keyboard, and has a name', () => {
    const view = html('```\n' + 'x'.repeat(300) + '\n```');

    const block = view.querySelector('pre');
    expect(block).toHaveClass('overflow-x-auto');
    expect(block).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('region', { name: 'Code' })).toBe(block);
  });

  it('names the box of a table, which scrolls and can be focused', () => {
    html('| a |\n| - |\n| 1 |');

    const box = screen.getByRole('region', { name: 'Table' });
    expect(box).toHaveAttribute('tabindex', '0');
    expect(box).toHaveClass('overflow-x-auto');
  });

  it.each([
    ['a fence with a language', '```js\nconst a = 1;\n```'],
    ['a fence without one', '```\nconst a = 1;\n```'],
  ])('shows %s as a block, not as the chip of inline code', (_, markdown) => {
    const view = html(markdown);

    const code = view.querySelector('pre code')!;
    // The chip (padding, background, wrapping) belongs to inline code only.
    expect(code.className).not.toMatch(/px-1|bg-raised|break-words/);
  });

  it('shows inline code as a chip', () => {
    const view = html('use `npm test` now');

    expect(view.querySelector('code')?.className).toMatch(/bg-raised/);
    expect(view.querySelector('pre')).toBeNull();
  });

  it('keeps the line breaks of a paragraph the way Markdown does, and shows nothing for empty text', () => {
    expect(html('one\n\ntwo').querySelectorAll('p')).toHaveLength(2);
    expect(html('').textContent).toBe('');
  });

  it('shows a task list as disabled checkboxes, which cannot be changed', () => {
    const view = html('- [x] done\n- [ ] open');

    const boxes = view.querySelectorAll('input[type="checkbox"]');
    expect(boxes).toHaveLength(2);
    for (const box of boxes) expect(box).toBeDisabled();
  });
});

describe('line breaks', () => {
  it('keeps a single line break as a line break, as these posts were shown before Markdown', () => {
    const view = html('first line\nsecond line\n\nnext paragraph');

    const [first, second] = Array.from(view.querySelectorAll('p'));
    expect(first.textContent).toBe('first line\nsecond line');
    expect(first).toHaveClass('whitespace-pre-line');
    expect(second).toHaveClass('whitespace-pre-line');
  });

  it('keeps them in a list item too', () => {
    const view = html('- one\n  still one');

    expect(view.querySelector('li')).toHaveClass('whitespace-pre-line');
  });
});

describe('headings', () => {
  it.each([
    ['#', 'H2'],
    ['##', 'H3'],
    ['###', 'H4'],
    ['####', 'H5'],
    ['#####', 'H6'],
  ])('shows %s one level lower, so the page keeps its one h1', (marks, tag) => {
    const view = html(`${marks} A heading`);

    expect(view.querySelector('h1')).toBeNull();
    expect(view.querySelector(tag)).toHaveTextContent('A heading');
  });
});

describe('links', () => {
  it('opens an http(s) link in a new tab, with no opener, no referrer and no search credit', () => {
    html('[the docs](https://example.com/docs?a=1)');

    const link = screen.getByRole('link', { name: 'the docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs?a=1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
  });

  it('turns a bare address into a link, and keeps a mailto one', () => {
    html('see https://example.com/x and [mail](mailto:a@example.com)');

    expect(screen.getByRole('link', { name: 'https://example.com/x' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'mail' })).toHaveAttribute(
      'href',
      'mailto:a@example.com'
    );
  });

  it('keeps a mail link in this tab: a blank tab would stay empty after the mail program opens', () => {
    html('[mail](mailto:a@example.com)');

    const link = screen.getByRole('link', { name: 'mail' });
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('keeps the footnotes of a post working: their anchors are followed, in this tab', () => {
    const view = html('A claim[^1].\n\n[^1]: The note.');

    const reference = view.querySelector('a[data-footnote-ref]');
    expect(reference).toHaveAttribute('href', '#user-content-fn-1');
    expect(reference).not.toHaveAttribute('target');
    expect(view.querySelector('a[data-footnote-backref]')).toHaveAttribute(
      'href',
      '#user-content-fnref-1'
    );
    expect(view).toHaveTextContent('The note.');
  });

  it('does not let text point at other elements of the page: only footnote anchors are followed', () => {
    const view = html('[a](#comments) [b](#main) [c](#user-content-fn-1)');

    expect(screen.queryByRole('link', { name: 'a' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'b' })).toBeNull();
    expect(view.querySelectorAll('a')).toHaveLength(1);
  });

  it.each([
    ['javascript:alert(1)'],
    ['JaVaScRiPt:alert(1)'],
    ['  javascript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['vbscript:msgbox(1)'],
    ['file:///etc/passwd'],
    ['/relative/path'],
    ['//evil.example.com'],
    ['#fragment'],
  ])('never follows %s: the text stays, the link does not', (target) => {
    const view = html(`[click me](${target})`);

    expect(screen.queryByRole('link')).toBeNull();
    expect(view.querySelector('a')).toBeNull();
    expect(view).toHaveTextContent('click me');
  });

  it('allows only absolute http(s) and mailto addresses', () => {
    expect(safeMarkdownUrl('https://a.example')).toBe('https://a.example');
    expect(safeMarkdownUrl('http://a.example')).toBe('http://a.example');
    expect(safeMarkdownUrl('mailto:a@a.example')).toBe('mailto:a@a.example');
    for (const bad of ['javascript:x', 'data:x', 'ftp://a.example', '/x', 'x', '']) {
      expect(safeMarkdownUrl(bad)).toBe('');
    }
  });
});

describe('raw HTML and scripts', () => {
  it.each([
    ['a script block', '<script>window.__xss = 1</script>'],
    ['an inline script', 'text <script>window.__xss = 1</script> text'],
    ['an image with a handler', '<img src="x" onerror="window.__xss = 1">'],
    ['an svg with a handler', '<svg onload="window.__xss = 1"></svg>'],
    ['an iframe', '<iframe src="https://evil.example"></iframe>'],
    ['a form', '<form action="https://evil.example"><input name="p"></form>'],
    ['a link with a handler', '<a href="https://a.example" onclick="window.__xss = 1">x</a>'],
    ['a javascript link in HTML', '<a href="javascript:window.__xss=1">x</a>'],
    ['a style block', '<style>body{display:none}</style>'],
    ['an object', '<object data="https://evil.example"></object>'],
    ['a base tag', '<base href="https://evil.example/">'],
    ['a meta refresh', '<meta http-equiv="refresh" content="0;url=https://evil.example">'],
  ])('shows %s as nothing at all: no element, no handler', (_, payload) => {
    const view = html(payload);

    for (const tag of [
      'script',
      'iframe',
      'form',
      'style',
      'object',
      'base',
      'meta',
      'svg',
      'img',
    ]) {
      expect(view.querySelector(tag)).toBeNull();
    }
    expect(view.innerHTML).not.toMatch(/onerror|onload|onclick|javascript:/i);
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('shows the text around a removed tag, and nothing of its attributes', () => {
    const view = html('before <b onclick="window.__xss = 1">bold</b> after');

    expect(view).toHaveTextContent('before bold after');
    expect(view.querySelector('b')).toBeNull();
    expect(view.innerHTML).not.toMatch(/onclick/);
  });

  it('shows HTML entities and angle brackets as text, not as markup', () => {
    const view = html('&lt;script&gt;alert(1)&lt;/script&gt; and `<script>`');

    expect(view.querySelector('script')).toBeNull();
    expect(view).toHaveTextContent('<script>alert(1)</script>');
  });

  it('does not run a script placed in a link title or an image alt', () => {
    const view = html('[x](https://a.example "\\"><script>window.__xss=1</script>")');

    expect(view.querySelector('script')).toBeNull();
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });
});

describe('images', () => {
  it('does not put a link inside a link, as in the common badge pattern', () => {
    const view = html('[![build status](https://img.example/badge.svg)](https://site.example/ci)');

    expect(view.querySelectorAll('a a')).toHaveLength(0);
    expect(view.querySelectorAll('a')).toHaveLength(1);
    expect(view.querySelector('img')).toBeNull();
    const link = screen.getByRole('link', { name: 'Image: build status' });
    expect(link).toHaveAttribute('href', 'https://site.example/ci');
  });

  it('does not load a remote image (that would tell its host who reads the post): it is a link', () => {
    const view = html('![a cat](https://tracker.example/pixel.png)');

    expect(view.querySelector('img')).toBeNull();
    const link = screen.getByRole('link', { name: 'Image: a cat' });
    expect(link).toHaveAttribute('href', 'https://tracker.example/pixel.png');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
  });

  it('names an image without alt text, and does not follow an unsafe image address', () => {
    html('![](https://a.example/p.png)');
    expect(screen.getByRole('link', { name: 'Image' })).toBeInTheDocument();

    const view = html('![x](javascript:window.__xss=1)');
    expect(view.querySelector('img')).toBeNull();
    expect(view.innerHTML).not.toMatch(/javascript:/i);
  });
});
