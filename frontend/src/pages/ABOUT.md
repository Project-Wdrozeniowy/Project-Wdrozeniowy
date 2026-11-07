# Pages

One slice owns each implemented screen. Keep its composition, private UI,
helpers, display configuration and adjacent tests together. Page slices consume
lower layers and do not import one another.

Each slice exposes only its page component through index.ts. App/router loads
that entry lazily; it does not depend on the slice's ui/lib/config structure.
There is no aggregate pages barrel and filenames do not configure routes.

API/Query state remains under shared/api by project convention. Business actions
remain in existing features. No loaders/actions, new entity layer or state
redesign is introduced by this structure.
