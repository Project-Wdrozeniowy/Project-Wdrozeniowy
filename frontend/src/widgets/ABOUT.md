# Widgets

Reusable page regions live here. Widgets may consume features/shared, and do
not import another widget or a page. A page-private block stays with its page.

The SPA experiment uses header/sidebar for the common frame and post-feed for
the card/mapping/loading/error presentation reused by home and forum. The
post-feed public entry exposes its supported surface; its internals do not
import that entry. Screen-specific query/navigation composition remains in pages.

See the [current experimental frontend guide](../../../docs/guides/frontend/README.md).
