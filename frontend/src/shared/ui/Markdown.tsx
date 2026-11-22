import { createContext, useContext } from 'react';
import type { ComponentPropsWithoutRef, ElementType, HTMLAttributes } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components, ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MARKDOWN_CODE_LABEL,
  MARKDOWN_FOOTNOTE_ANCHOR,
  MARKDOWN_IMAGE_LABEL,
  MARKDOWN_LINK_PROTOCOLS,
  MARKDOWN_LINK_REL,
  MARKDOWN_TABLE_LABEL,
} from '@/shared/ui/markdown.const';

/**
 * A link target that may be followed, or '' for anything else (an unsafe protocol, a relative
 * address, text that is not an address). Only absolute http(s) and mailto links survive, and the
 * footnote anchors that the renderer makes.
 */
export function safeMarkdownUrl(url: string): string {
  if (MARKDOWN_FOOTNOTE_ANCHOR.test(url)) return url;
  try {
    return (MARKDOWN_LINK_PROTOCOLS as readonly string[]).includes(new URL(url).protocol)
      ? url
      : '';
  } catch {
    return '';
  }
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-blue-500';
const LINK = `text-accent hover:underline break-all ${FOCUS}`;

/** What react-markdown gives a custom element: the attributes of the tag, and its parsing node. */
interface StyledElementProps extends ExtraProps, HTMLAttributes<HTMLElement> {}

/** An element of user text with its own look, without the parsing node react-markdown passes. */
function styled(Tag: ElementType, className: string) {
  return function StyledElement({ node, ...props }: StyledElementProps) {
    void node;
    return <Tag {...props} className={className} />;
  };
}

type MarkdownImageProps = ComponentPropsWithoutRef<'img'> & ExtraProps;

/** True inside a link, where an image must not become a second, nested link. */
const InsideLink = createContext(false);

const isWeb = (href: string) => /^https?:/i.test(href);

/**
 * How each element of user text looks, and what it may do. The text is untrusted:
 * - no raw HTML (`skipHtml`), and the renderer builds React elements, never an HTML string;
 * - links: only http(s) and mailto, and the footnote anchors. A web link opens in a new tab without
 *   opener or referrer; a mail link and a footnote link stay in this tab;
 * - images are not loaded (that would tell a third-party host who reads the post): an image is a
 *   link to its address, named by its alt text, or plain text inside another link;
 * - headings start at h2, so the page keeps its one h1 (the title). HTML has no level below h6, so
 *   the author's h5 and h6 are both h6;
 * - a single line break stays a line break (`whitespace-pre-line`), as in the plain text these posts
 *   used to be shown as;
 * - code and tables scroll inside their own box, which has a name and can be focused, so a long
 *   line never widens the page.
 */
const COMPONENTS: Components = {
  a: ({ node, href, children, ...props }) => {
    void node;
    if (!href) return <span>{children}</span>;
    const web = isWeb(href);
    return (
      <a
        {...props}
        href={href}
        {...(web ? { target: '_blank', rel: MARKDOWN_LINK_REL } : {})}
        className={LINK}
      >
        <InsideLink.Provider value>{children}</InsideLink.Provider>
      </a>
    );
  },
  img: function MarkdownImage({ node, src, alt }: MarkdownImageProps) {
    void node;
    const insideLink = useContext(InsideLink);
    const text = alt?.trim() ? `${MARKDOWN_IMAGE_LABEL}: ${alt.trim()}` : MARKDOWN_IMAGE_LABEL;
    if (insideLink || typeof src !== 'string' || !src) return <span>{text}</span>;
    return (
      <a href={src} target="_blank" rel={MARKDOWN_LINK_REL} className={LINK}>
        {text}
      </a>
    );
  },
  h1: styled('h2', 'text-fg font-bold text-xl mt-2'),
  h2: styled('h3', 'text-fg font-bold text-lg mt-2'),
  h3: styled('h4', 'text-fg font-semibold text-base mt-2'),
  h4: styled('h5', 'text-fg font-semibold text-base mt-2'),
  h5: styled('h6', 'text-fg font-semibold text-sm mt-2'),
  h6: styled('h6', 'text-fg-soft font-semibold text-sm mt-2'),
  p: styled('p', 'break-words whitespace-pre-line'),
  li: styled('li', 'whitespace-pre-line'),
  ul: styled('ul', 'list-disc pl-6 flex flex-col gap-1'),
  ol: styled('ol', 'list-decimal pl-6 flex flex-col gap-1'),
  blockquote: styled('blockquote', 'border-l-4 border-line pl-4 text-fg-soft'),
  hr: styled('hr', 'border-line'),
  pre: ({ node, ...props }) => {
    void node;
    return (
      <pre
        {...props}
        // A box that scrolls must be reachable by keyboard, say what it is, and show where it is.
        tabIndex={0}
        role="region"
        aria-label={MARKDOWN_CODE_LABEL}
        className={`bg-raised text-fg rounded-lg p-3 overflow-x-auto text-sm ${FOCUS}`}
      />
    );
  },
  code: ({ node, className, children, ...props }) => {
    void node;
    // A block carries a language class, or ends with a newline (a fence without a language); inline
    // code gets its own chip and may wrap.
    const block = Boolean(className) || String(children ?? '').endsWith('\n');
    return block ? (
      <code {...props} className={className}>
        {children}
      </code>
    ) : (
      <code {...props} className="bg-raised text-fg rounded px-1 py-0.5 text-sm break-words">
        {children}
      </code>
    );
  },
  table: ({ node, ...props }) => {
    void node;
    return (
      <div
        className={`overflow-x-auto ${FOCUS}`}
        tabIndex={0}
        role="region"
        aria-label={MARKDOWN_TABLE_LABEL}
      >
        <table {...props} className="border-collapse text-sm" />
      </div>
    );
  },
  // A minimum width, so a narrow screen scrolls the table instead of stacking words in a sliver.
  th: styled('th', 'border border-line px-3 py-1.5 text-left font-semibold min-w-28'),
  td: styled('td', 'border border-line px-3 py-1.5 min-w-28'),
};

interface MarkdownProps {
  /** Untrusted text written in Markdown. */
  children: string;
}

/** Markdown from a user, shown safely. See `COMPONENTS` for what is and is not allowed. */
export default function Markdown({ children }: MarkdownProps) {
  return (
    <div className="flex flex-col gap-3 text-fg-muted text-base leading-relaxed break-words min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeMarkdownUrl}
        components={COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
