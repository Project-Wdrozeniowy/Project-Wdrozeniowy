# Frontend architecture

The adopted Vite/React Router SPA uses the ownership map below. Start at the
[root README](../../../README.md), [frontend runbook](../../../frontend/README.md)
and [session policy](../sessions.md). The [PWDRZ-160 history](../../spikes/pwdrz-160-vite-spa/README.md)
preserves the original comparison and route-organization evidence.

## Ownership

| Location                                       | Responsibility                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/main.tsx`                                 | Configure CSP-compatible validation, import global styles and mount App                |
| `app/App.tsx`                                  | Render RouterProvider with the browser router                                          |
| `app/router/router.ts`                         | Create one browser router outside component rendering                                  |
| `app/router/routes.tsx`                        | URL matching, lazy page imports and nested layout/guard composition                    |
| `app/router/RouteErrorBoundary.tsx`            | Global navigation/not-found error UI                                                   |
| `app/router/guards/`                           | Existing UI session/role guards and session loader                                     |
| `app/layouts/`                                 | Root provider/scroll/focus composition, auth frame, header/sidebar frame               |
| `app/providers/`, `app/config/`, `app/styles/` | Application-wide providers, validation setup and CSS                                   |
| `pages/<screen>/`                              | Screen composition and screen-private UI, helpers and display constants                |
| `widgets/post-feed/`                           | Reused post cards, view mapping and feed error/loading presentation                    |
| `widgets/header/`, `widgets/sidebar/`          | Existing reusable site regions                                                         |
| `features/`                                    | Existing sign-in/up, profile/password editing, publishing, comments and voting actions |
| `shared/api/`, `shared/auth/`                  | Existing API/Query/Orval and memory-token/session infrastructure                       |
| `shared/ui/`                                   | Reusable presentation, including the profile-load error used by profile and settings   |

Page slices are home, forum, post, search, login, register, dashboard, profile,
settings, notifications and admin. The post page shows the real post
(`GET /forum/posts/{slug}`) with its comments below it, and the feed links to it; opening a post
records no "opening" (that has its own rules, PWDRZ-186). The notification
page is reached from the header bell, which shows the unread count of the notification API;
there is no real-time update until PWDRZ-104. The profile lists the user's own published posts
(`GET /forum/posts?author=`, a page at a time); its sections without an API (comments, saved,
activity) are shown as not available yet, and the sidebar card shows only counts the platform has
(no followers yet). Screen-specific code
stays in its page; dashboard charts and a page's feed are not promoted to widgets
just because they are large. The shared post-feed presentation is genuinely
consumed by both home and forum.

The settings page has one URL per section (`/settings/profile`, `/settings/account`);
`/settings` and any section that cannot be opened go to `/settings/profile`. The
design's other tabs (notifications, appearance, privacy, content) are shown as not
available yet until the backend has endpoints for them. Profile editing lives only
on the settings page; the profile page is read-only and links to it. Both settings
sections reuse `features/edit-profile/ProfileForm` with the fields they show.

```text
src/
  main.tsx
  app/
    App.tsx
    config/configureValidation.ts
    layouts/{RootLayout,AuthLayout,MainLayout}.tsx
    providers/
    router/
      router.ts
      routes.tsx
      RouteErrorBoundary.tsx
      guards/
      __tests__/
    styles/globals.css
  pages/
    home/
      index.ts
      ui/{HomePage,HomeFeed}.tsx
      config/homeFeed.const.ts
    forum/
      index.ts
      ui/
      lib/
    post/
      index.ts
      ui/PostPage.tsx
    ... other implemented screens
  widgets/
    post-feed/
      index.ts
      ui/
      lib/
      config/
    header/
    sidebar/
  features/
  shared/
  store/   # existing state ownership, not reorganized here
  utils/   # existing compatibility utilities, not reorganized here
  test/
```

Only segments with real code are created. No new entities/processes layer,
empty folder scaffold, generic base page or route-generation mechanism is added.
Existing store/profile overlap remains PWDRZ-150's responsibility.

## Routing

React Router **7.18.5 Data Mode** uses explicit RouteObject configuration. The
router is not configured by filenames. The former `(auth)`, `(main)`,
`(protected)`, `[slug]`, `_ui`, `_lib`, `page.tsx` and `layout.tsx` structure has
been removed from source. Components use the project's PascalCase filenames.

The root `/` route composes RootLayout. Pathless AuthLayout/MainLayout routes
select the frame without adding URL segments. The home page is an index route;
`forum/:slug` is a dynamic segment. Pathless AuthGuard and ADMIN RoleGuard
routes use Outlet directly, replacing two redundant wrapper-only layouts.
All ten existing URLs and their redirect/initialization semantics are retained.

Each page loads through its own public entry, for example:

```tsx
{
  path: 'forum',
  lazy: async () => ({ Component: (await import('@/pages/forum')).ForumPage }),
}
```

The exported routes are also consumed by createMemoryRouter in integration
tests. Test code does not import the live browser-router singleton. There is
no React Router Framework Mode plugin, automatic filesystem routing or server
rendering. Loaders/actions are not introduced: TanStack Query and the existing
Orval transport continue to own server-cache access and mutation behavior.

RootLayout keeps the current Query/Auth/Toast providers, scroll restoration
and path-change focus behavior. Providers are not recreated per page. Query-only
navigation keeps filter/pagination focus. The global route error boundary
retains the existing not-found and failure UI. API authorization remains in
Spring; Spring owns JDBC sessions and CSRF; Express transparently forwards HTTP (PWDRZ-99).

## Feed cards and the way to a post (PWDRZ-81)

Each card in the feed opens its own post: the title links to `/forum/<slug>` and the "N Comments"
link to `/forum/<slug>#comments` (the post page scrolls to the discussion once it has loaded). Both
are real links, so keyboard, middle-click and a copied address work, and the comments link is named
"3 Comments on <title>" so a list of links is not the same words once per card. Share and Save have
no API and stay disabled with "Not available yet"; they are not described as actions.

The feed keeps the topic, tag and page in the URL (`?topic=`, `?tag=`, `?page=`), so Back from a
post returns to the same page of the same filter, and the browser restores the scroll position. The
e2e test `forum-navigation.spec.ts` follows this on the real stack: card, post, Back, the keyboard
path, a reload and a direct address, as a guest and a member, on a desktop and a phone width.

## Imports and public entries

Production dependencies flow `app → pages → widgets → features → shared`;
layers may be skipped. Page, widget and feature slices do not import peers on
the same layer. App and Shared are not partitioned into business slices.

Every new page slice has one small `index.ts` exporting its page component.
The new post-feed slice exposes only its supported components, view-data type
and mapper. These entries provide a concrete stable contract for router/page
consumers; they are not global barrels or a requirement to wrap every existing
feature in an index. Internal modules import their own concrete files, never
their own public barrel. No export-star surface or aggregate `pages/index.ts`
is introduced, so route lazy loading remains separated by page.

Existing feature/shared public files retain their explicit import conventions.
Use `@/` for cross-module imports and relative paths within the same directory.
Keep API DTO, constant, schema and extracted type suffixes from the naming guide.
No transitional aliases or forwarding files point to the removed Next folders.

Pure ProfileLoadError presentation moved to shared UI because both profile and
settings consume it. Settings does not depend on the profile page. Business
requests and cache/session ownership were not moved into the error component.

## Application shell (PWDRZ-28)

The shell is compared with the design at 1440, 1024, 768, 390 and 320px, for a guest and for a
member with a very long name and a focused search; `e2e/tests/shell.spec.ts` holds that check
(every page link reachable by pointer and keyboard, "Create Post" whole on screen, the logo link
named "Orbita", and no horizontal scroll). Decisions:

- **Page links.** From 768px they are in the top bar with an icon each (Home, Forum, Analytics);
  below 768px they are the bottom bar, with the profile for a member. The logo link is named by
  its visible text at every width.
- **User actions.** A member has the theme toggle, the notification bell and one account menu
  behind the user icon (name, Profile, Settings, Sign out), at every width, as in the design. Text
  links for the name, "Settings" and "Sign out" did not fit next to the page links and the search
  field between 768px and 1000px. A guest has the same menu on a phone and the Sign in and Sign up
  buttons from 768px. The search field is narrower from 768px to 1023px.
- **Analytics is public.** The dashboard route needs no session: its figures are the public
  analytics, and only the user's own totals need one (they are shown to a member only).
- **Unsupported actions.** An entry or action whose feature does not exist is left out of a menu
  (Messages, Saved posts, Your stats, Achievements, followers), or, where the design shows it
  inside a control we do have, shown disabled with "Not available yet" (Share, Save, the profile
  and settings tabs). No counter, badge or trend is invented to imitate the design.
- **Sidebar.** The user card links only pages the app has (Profile, Notifications with its real
  unread count, Settings) with an icon each, and shows real post and comment counts. Community
  activity shows the platform's posts and comments of the last 7 days with an icon each; Trending
  Topics shows the categories with the most posts (no per-topic trend arrows: there is no trend per
  topic).

## Sign-in and sign-up pages (PWDRZ-29)

Every action on these pages has an outcome. What the backend cannot do yet is shown as unavailable,
with the reason on the page, and is not a control that does nothing or a link that ends in a 404:

- **Password recovery.** There is no recovery contract (no reset endpoint, no email delivery), so
  the "Forgot password?" link is gone and the password field says "Password recovery is not
  available yet." (`PASSWORD_RECOVERY_UNAVAILABLE_TEXT`).
- **Google, GitHub and Discord.** There is no social sign-in contract. `SocialSignInNotice` shows the
  providers as a plain list under a "Coming soon" badge, with a sentence that says to use the form.
  They are not buttons. It is the same pattern as the interests on the sign-up page (PWDRZ-154).

Both are provisional: the constants files (`login.const.ts`, `socialSignIn.const.ts`) name what is
missing and what to do when it exists. Building recovery or OAuth is new authentication work, not a
fix on these pages. A test lists every link on both pages and checks each one has a route.

## Profile page (PWDRZ-60)

`/profile` shows the signed-in user and is read-only. Editing lives under `/settings` (PWDRZ-108),
reached by "Edit profile" and by the "Settings" entry of the section bar. Both read the same cached
profile (`useMyProfile`), and a save updates that cache and the store, so the profile, the account
menu and the sidebar card show the same name.

- **Sections** are links (`/profile?tab=activity`), so a reload, the back button and a shared link
  keep the open one. A missing, unknown or unavailable value opens the posts (`parseProfileTab`).
- **Posts** and **Activity** have data. Each state is truthful: loading, an empty text, or a fixed
  error with a retry. A section that is not open does not request anything.
- **Comments** and **Saved** are shown as "Not available yet": the API has no endpoint that lists a
  user's comments and no bookmarks. Neither has a ticket yet (see `PROFILE_TABS`).
- **Activity** shows the user's totals from `/analytics/me`. The chart over time is PWDRZ-153's: the
  API has no per-day series of the user's own activity.
- **Left out of the design on purpose:** karma, badges, recent activity, followers, location, website
  and Follow. There is no data for them, and the numbers would be invented. The profile card shows
  the real vote totals (upvotes received, downvotes received, votes cast) instead. Reviewers should
  confirm this.

## Post voting (PWDRZ-97)

A vote is the server's. The screen changes only when the API has answered (`useVotePost`), so a
rejected or failed request leaves the post as it was and shows a fixed message; there is nothing to
roll back. This was chosen over optimistic updates on purpose: a vote the server did not accept is
never shown. The buttons show a busy state while a request runs.

- **Cast, switch, retract.** The same direction again retracts (`DELETE /forum/votes/{id}`), anything
  else casts (the server switches an existing vote). A cast answers with the new score. A retract
  answers 204, so the score is computed and then confirmed by a reload of the lists.
- **One cache answer for every copy.** The feed (and the Home feed), the profile's list of posts and
  the post page all get the same outcome, so they agree without a reload.
- **One request at a time per post.** A column asks the mutation cache at the click
  (`queryClient.isMutating` with `votePostMutationKey`), not the last render: a double click
  delivers its second click before the screen has caught up, and a vote started on another screen a
  moment ago also counts. The busy look comes from `useIsMutating`.
- **Guests** are sent to `/login` and nothing is requested. A 401 is silent: the session handling
  already sends the user to sign in.
- **Tests.** The unit tests cover each rule above. `vote-consistency.spec.ts` runs the real stack:
  cast with a double click (one request), the post page and the feed agree, switch, reload, retract.

## Theming

The app has a light theme (the default) and a dark theme, as in the Figma design. Components
never name a theme colour such as `slate-800` or `gray-50`: they use the semantic tokens of
`app/styles/globals.css` (`bg-page`, `bg-surface`, `bg-raised`, `border-line`, `text-fg`,
`text-fg-soft`, `text-fg-muted`, `text-fg-subtle`, `text-accent`, `text-danger`, `text-warning`,
`cat-*` for categories). A colour with no token (an error box, a brand colour) uses the `dark:`
variant, for example `bg-red-50 dark:bg-red-500/10`. Text on a coloured button stays `text-white`.

The theme is `data-theme` on `<html>`. `public/theme-init.js` sets it before the first paint
(stored choice, else the system preference; it is an external file because the gateway's CSP
allows no inline scripts). `ThemeProvider` keeps it in step with the system and with other tabs,
and the header's `ThemeToggle` switches it. Add a token, not a hard-coded colour, when a new role
is needed.

## Browser storage and consent

Spring's `SESSION` cookie is the only storage the app needs. Everything else the frontend writes
is **optional** and exists only after the user accepted it in the banner at the top of the page
(`widgets/consent-banner`, state in `store/slices/consentSlice.ts`):

| Key (`shared/lib/storageKeys.const.ts`) | Holds                             | Optional                  |
| --------------------------------------- | --------------------------------- | ------------------------- |
| `orbita.consent`                        | `granted` or `denied`, the answer | no (remembers the answer) |
| `orbita.theme`                          | `light` or `dark`                 | yes                       |
| `orbita.recentSearches`                 | the last five search terms        | yes                       |

Rules for code that stores something in the browser:

- Optional storage is read and written only through helpers that check `hasStorageConsent()`
  (`shared/lib/storageConsent.ts`). Without a granted answer a theme choice and the search history
  work for the current visit only and nothing is written. `theme-init.js` follows the same rule.
- Rejecting or withdrawing deletes every key in `OPTIONAL_STORAGE_KEYS`. A new optional key goes
  into that list, into the banner's list (`consentBanner.const.ts`) and into this table.
- Never store credentials, tokens or personal data in browser storage.
- Accepting and rejecting must look the same, the question must not hide a focused control (it is
  part of the page flow), and the footer's "Storage settings" button reopens it at any time.

**Unverified assumption.** The banner text and the split into "needed" and "optional" are an
engineering reading of the ePrivacy storage rules (EDPB Guidelines 2/2023 cover local storage too),
not a reviewed legal text or a compliance claim. The team should confirm it, and write a privacy
notice, before any public deployment.

## Analytics figures

The sidebar ("Community activity", "Trending Topics") and the dashboard show only what the
platform counts, read through `shared/api/analytics/` from the public analytics endpoints
(`/analytics/public/comparison`, `/public/activity`, `/public/categories`, `/trending-posts`) and
the signed-in user's own totals (`/analytics/me`). The admin-only `/analytics/summary` and
`/analytics/trends` are not used by these pages. Never put a fixed or invented number on a page:
if the platform cannot know a figure (online users, posts per minute, hourly activity), the page
does not show it. A card that reads a query uses `shared/ui/QueryState`, so loading, a fixed
failure message with a retry, and "nothing yet" look the same everywhere. Charts carry their
values as a text alternative.

## Tests and scope

Tests move with their UI/helper modules. Page/form and session/provider
integration tests live under app/router or app/providers, where assembling the
participating layers is intentional. Existing behavioral assertions and all
service coverage thresholds remain. New source-boundary checks cover downward
imports, peer-slice isolation, public page/widget integration and self-barrel
cycles. They do not claim that existing store/utils have been redesigned.

Run root check, frontend coverage/build and managed real-stack E2E after a
routing refactor. Never replace actual backend/browser acceptance with mocked
planned feature success. Product placeholders and their owners stay unchanged.

## References

The concrete tree is a project choice following
[FSD layer responsibilities/import direction](https://feature-sliced.design/docs/reference/layers),
[FSD public API boundaries](https://feature-sliced.design/docs/reference/public-api),
and the installed version's
[React Router data routing](https://reactrouter.com/7.18.5/start/data/routing) and
[lazy route properties](https://reactrouter.com/7.18.5/start/data/route-object#lazy).
