# PWDRZ-169 implementation plan

Approved by the user on 2026-11-23. Primary owner: Ruslan 82179. Base: develop
`d2daaefd23cd02e569f8e5865e67e6770292ee7c`. Task branch:
`PWDRZ-169-post-insights`. The user explicitly authorized local commits and
publication of this branch with an origin upstream; no PR, merge or Jira changes.

## Scope and agreed decisions

- Place public/owner engagement between the article and the discussion.
- Reuse PWDRZ-167 public/owner GETs, generated bindings, existing transport and
  Spring SESSION authorization. No schema, backend, gateway or dependency changes.
- Public viewers get score and reachable visible comments; Details adds accumulated
  openings, collectedFrom in UTC and the non-unique-reader explanation.
- Owners get all summary fields and the UP/DOWN breakdown, including their draft.
  Staff who are not the owner do not receive owner data. No summaries for a deleted
  post, or another person's non-public post in the staff detail view.
- The design combines PWDRZ-169 and PWDRZ-171. Daily/compact charts, 7/30-day controls
  and daily tables remain PWDRZ-171. Do not add inert trend controls.
- Initial isLoading has a skeleton. Query errors have a representative, fixed,
  accessible message and recovery; never render raw transport/server diagnostics.
- Refresh updates both summary and article, without remounting the discussion or
  submitting its draft. Failures of either read are not reported as a full success.
- Votes and comment creation/reply/deletion invalidate only the affected post's
  summary caches. A failed statistics refresh does not undo an accepted mutation.
- Owner query keys include the account; reuse session generations/cancellation and
  cache clearing. Old post/account results must not appear in a replacement view.
- Label comments as visible comments including replies, not root discussion threads.
  A zero score does not prove there were no votes. Collection began at collectedFrom;
  do not claim publication-lifetime history or unique reach.

## Context map

| Files                                                            | Change                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------- |
| `frontend/src/shared/api/analytics/postEngagement.ts`            | Generated-key-based account scoping and mutation invalidation |
| `frontend/src/shared/api/analytics/usePostEngagement.ts`         | Select permitted generated query; consume AbortSignal         |
| `frontend/src/pages/post/ui/PostInsights.tsx`                    | Post/account-keyed card, refresh, state/focus handling        |
| `frontend/src/pages/post/lib/postInsights.ts`                    | Safe error presentation and UTC/number formatting             |
| `frontend/src/pages/post/ui/PostPage.tsx`                        | Compose card and pass post ID to comments                     |
| `frontend/src/shared/api/forum/useVotePost.ts`, `useComments.ts` | Refresh affected summary after accepted mutations             |
| `frontend/src/features/post-comments/CommentSection.tsx`         | Pass post ID to comments query composition                    |

References: `shared/api/generated/orbita.api.ts`, `shared/api/profile/currentUser.ts`,
`shared/auth/session.ts`, `app/providers/QueryProvider.tsx`, shared SkeletonStatus,
PanelError/RetryButton, theme tokens and icons. Generated output is not handwritten.

## Delivery sequence and observable outcomes

1. **Baseline/branch:** record revision, preserve staged work and establish upstream.
2. **Queries:** tests demonstrate endpoint selection, account keys and cancellation
   of a first snapshot overtaken by a mutation.
3. **Card:** public/owner values and UTC collection date appear from actual DTOs;
   public Details works and owner trend controls are absent.
4. **States:** delayed reads show a skeleton, failures show no internal details,
   retries recover without losing keyboard position or blocking the article.
5. **Refresh:** one action refreshes both resources, preserves expansion/draft,
   rejects duplicate activation and represents partial failure truthfully.
6. **Mutations:** accepted votes and comment changes trigger server-confirmed totals.
   Visible replies below deleted placeholders remain counted by the API.
7. **Account boundary:** provider/transport tests cover logout, expiry, replacement,
   late owner answers and a same-account focus check.
8. **Accessibility/layout:** semantic regions and values, disclosure relationships,
   live statuses, focus recovery, light/dark and 390/320px layouts.
9. **Real stack:** managed Chromium/Gateway/Spring/migrated PostgreSQL scenario;
   persisted votes/discussion, direct access denial and unchanged opening totals/events.
10. **Gates:** frontend typecheck/lint/format/coverage/build, binding/codegen checks,
    E2E typecheck/format/infra and full managed suite. Use documented direct workspace
    commands if host Nx socket initialization fails; do not modify service gates.
11. **Handoff:** record source/run identity, expected versus observed fixtures,
    screenshots, results, retained prerequisites and targeted provisional review.

## Test map

- `shared/api/analytics/__tests__/usePostEngagement.test.tsx`: transport selection,
  account keys, inactive invalidation and controlled snapshot race.
- `pages/post/ui/__tests__/PostInsights.test.tsx`: metrics, UTC, access variants,
  zero/error/retry, refresh/focus and post/account replacement.
- `shared/api/forum/__tests__/engagementMutations.test.tsx`: accepted/rejected votes,
  root/reply/delete invalidation and accepted mutation versus failed read.
- `app/providers/__tests__/postInsightsSession.integration.test.tsx`: actual providers,
  transport, session lifecycle and late-response isolation.
- Existing PostPage/CommentSection tests: retain article/discussion behavior.
- `e2e/tests/post-insights.spec.ts`: real browser success and request-failure recovery;
  no mocked successful API responses. Read-only SQL is limited to the launcher's
  validated disposable project and fixture ID.

## Acceptance and remaining ownership

All applicable gates must pass; capture view_count and POST_VIEWED before/after
three refreshes. Separate actual source snapshots from commit labels and local
evidence from remote CI. Do not claim manual screen-reader speech verification
from DOM/keyboard tests. No WCAG/legal certification is implied.

PWDRZ-166 remains responsible for navigation/reload opening delivery. In its absence,
seed openings through the real API; this does not demonstrate SPA opening delivery.
PWDRZ-171 owns trends. PWDRZ-176 still has other integration prerequisites, so this
delivery alone does not unblock the complete journey.

Design references in file `J2k3T1a2db6v51UckdUyEU`: public expanded `400:328`, author
compact `400:588`, public mobile `400:2067`, developer handoff `400:3797`.
