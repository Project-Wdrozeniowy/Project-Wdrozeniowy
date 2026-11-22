/** Only these protocols are followed: a `javascript:`, `data:` or `vbscript:` link is never one. */
export const MARKDOWN_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'] as const;

/** Links in user text: no opener, no referrer, no search-engine credit for user-generated content. */
export const MARKDOWN_LINK_REL = 'noopener noreferrer nofollow ugc';

/** The text of an image: "Image" alone, or "Image: <alt text>" when it has a description. */
export const MARKDOWN_IMAGE_LABEL = 'Image';

/**
 * The footnotes of a post link to ids that the renderer itself makes, all with this prefix. They are
 * the only same-page links that are followed, so user text cannot point at the page's own elements.
 */
export const MARKDOWN_FOOTNOTE_ANCHOR = /^#user-content-[\w-]+$/;

/** The names of the boxes that scroll, for assistive technology (they can be focused). */
export const MARKDOWN_CODE_LABEL = 'Code';
export const MARKDOWN_TABLE_LABEL = 'Table';
