# PWDRZ-190 — own publication editing

## Scope and approved decisions

User-approved plan, 24 November 2026: edit title/body in a modal matching the
creation design, with product limits 120/5000. Use the existing generated PATCH
and Spring SESSION/CSRF. Send changed text fields only. No status/category/tag
controls, backend changes, migrations, autosave, persistent draft recovery or
new conflict/versioning protocol. Ordinary failures preserve the open form;
session/account transitions retain the existing cache-isolation policy.

Jira description, acceptance criteria, all five history entries and zero
comments were reviewed during planning. Relevant dependencies: PWDRZ-164/65,
and opening semantics PWDRZ-165/166. Figma thread 197:1759 and creation modal
329:1926 in J2k3T1a2db6v51UckdUyEU were reviewed. No project resources changed
during planning. Jira/Figma changes and PRs remain outside the request. Commits
and branch publication were subsequently explicitly authorized by the user;
see the publication handoff below.

## Source and context map

- Base: `3fb937d4f7ec75aeeae3fcb613fc29deb71f094f`, equal to fetched
  `origin/develop` at implementation start; clean worktree and index.
- Branch: `PWDRZ-190-edit-own-publication`. Verification used working-tree
  source before commit grouping; the base SHA and source manifest identify the
  implementation that was tested.
- Changed integration: `pages/post/ui/PostArticle.tsx` -> `features/edit-post`.
- Shared presentation: `shared/ui/PostDialog.tsx`, `PostTextField.tsx`, used
  by editing and existing creation. Shared text limits live in
  `shared/constants/postText.const.ts`.
- API/cache: `shared/api/forum/useEditPost.ts`, generated operations/models,
  current-user/session generation and existing feed/author/search/trending keys.
- Tests: edit helper units, PostPage/real-transport integration, mutation/cache
  tests, existing create suite and `e2e/tests/post-editing.spec.ts`.
- Reference patterns: `CreatePostDialog`, `ProfileForm`, `useUpdateProfile`,
  `useVotePost`. No feature-to-feature imports; no API/schema/config changes.

## Test-first evidence

Before implementation, own-post page tests failed because Edit post was absent
(4 failed). Helper unit tests were run against inert scaffolding: all 3 failed
on partial request construction, validation and access rules, not import/setup
errors. Mutation cache test failed because saved text was not updated.

## Implementation and verification

- Editor saves changed title/content only. Cancel starts the next edit from the
  loaded post. Product limits apply to changed fields; existing longer text is
  never truncated. Markdown whitespace is preserved exactly.
- Shared creation presentation was extracted without changing its draft,
  publishing or category/tag behavior. Creation regressions pass.
- Mutation updates confirmed text in detail/feed/author/search/trending, cancels
  older reads and invalidates the lists. It preserves newer engagement and
  rejects cache writes from a replaced session/account.
- A real concurrent moderation-lock test exposed an error disappearing with
  the editor. The fixed rejection remains visible after the availability
  refetch removes editing controls. A regression test covers that transition.

Implementation/test manifest: `e2e/artifacts/pwdrz190-source-manifest.json`,
17 changed/new source and test files; aggregate SHA-256
`5db087f6b916d04d543271eda519b666c40a2fee5955130cfa7851ba51f99850`.
The manifest excludes documentation/metadata so this record does not hash itself.
The earlier 14-file manifest was
`1fb0b434b93efe764c7d0fcb59af18bdff87e09101594fe2c0051bda35689b04`;
the subsequent 15-file manifest was
`3c7979c1e99e3f13e43c78a38732507d21f202fa6d0ee92b7f40645ba7ef3f0e`.
The final manifest also includes the explicitly approved comment-header fix and
its deterministic browser regression fixture.

| Check                                  | Observed result                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Frontend unit/integration and coverage | 124 files, 1370 tests passed; statements 98.39%, branches 94.35%, functions 98.21%, lines 99.15%; all four original gates pass |
| Root `check`                           | Lint/typecheck/format targets passed for frontend/gateway/E2E/tooling; normal Nx caching retained                              |
| Frontend production build              | Passed; existing dependency annotation and large-chunk warnings remain                                                         |
| OpenAPI binding drift                  | All 102 generated files match; no contract/generated changes                                                                   |
| Codegen regression suite               | Passed, including intentionally invalid schema/drift cases                                                                     |
| Earlier full managed E2E               | 60 passed / 2 failed before the approved correction; retained as historical evidence                                           |
| Earlier scoped managed E2E             | 4 passed: editing and corrected profile selector                                                                               |
| Final approved full managed E2E        | 62 passed, one worker, zero retries; normal cleanup completed                                                                  |

Commands use Node 24.15.0 and the bundled npm 11.12.1 CLI (the global npm is 12).
Coverage command: `npm run test:coverage --workspace frontend -- --maxWorkers=4`.
An initial default-parallel run had timeouts; limiting local workers changes
neither tests, thresholds nor their timeouts. The subsequent four-worker run
identified two component-props naming violations, which were fixed; the final
four-worker suite above passes.

Root checks initially hit the local Nx IPC socket-path length limit. Re-running
with `NX_SOCKET_DIR=<repository>/.nx/s` passed without configuration changes.
Logs: `e2e/artifacts/pwdrz190-check-final.log`,
`pwdrz190-build-final.log`, `pwdrz190-frontend-coverage-final.log`.

Real-stack run `1795540678087-5ead1141` had 56 passes and five failures: four
loopback connection errors and one too-strict new search-link selector. The
selector was corrected to account for the link's accessible metadata. This
run is not reported as a passed gate.

Focused real-stack run `1795541156778-631ee4a7`: persistence/cancel/counters and
guest/other-author cases passed; draft persistence and actual 403 after a
moderator lock worked, but the visible-error assertion failed. This exposed
the disappearing-error defect fixed above; that run is not a passed gate.

Desktop light and 320px dark editor screenshots from that run were visually
inspected. The modal fits, labels/counters/actions are visible, the page has no
horizontal overflow, keyboard focus is contained and restored. This is scoped
browser evidence, not a claim of complete WCAG conformance.

The final full E2E run uses fresh disposable PostgreSQL with real Flyway,
Express-served production SPA, SESSION/CSRF, Chromium, one worker and zero
retries. Ports 3120/8182 isolate it from the earlier 3100/8180 loopback run;
no test filter is set. Backend `verify` and remote CI are not separately run
for this frontend-only change; migrated persistence/security is checked through
the managed real backend. No skipped/unrun gate is described as passed.

## Targeted provisional-code review

Exact PWDRZ-190 and current branch/task references were checked in the affected
source/tests, relevant documentation and hidden instructions. No guard is owned
by PWDRZ-190. Existing category/tag and recommendation adapter markers belong
to other tasks and are not changed. The recommendation stub descriptions are
stale relative to the implemented backend, but those adapters have no current
production consumer and are outside the editor.

The checked base has the backend intentional-opening endpoint but no SPA
opening delivery. Editing must add zero openings; implementing PWDRZ-166 remains
outside this task. Its remote/Jira metadata is not execution evidence here.
No other owner's task is declared unblocked by this work.

## Additional authorized discussion-layout correction

On 24 November 2026 the user explicitly approved the bounded correction below.
The comment header now wraps, and an unbroken author name breaks within the
available width. Neither author nor date is truncated. The existing real-stack
insights scenario now creates a valid 100-character unbroken display name and
checks the root comment and nested reply at 768/390/320px. No API or discussion
behavior changes were needed. Existing comment/editor tests passed (47 cases).

Full run `1795541422871-c9917c87` (ports 3120/8182) completed with 60 passes
and two failures. All three PWDRZ-190 cases passed, including the concurrent
lock rejection after its fix. No loopback connection failures occurred.

1. `profile.spec.ts` found two sidebar values of 11: own post count and community
   activity. New synthetic fixtures made the old broad selector ambiguous.
   The assertion now scopes the value to the user's account card; its real
   browser check passed in the final scoped run. No profile product code changed.
2. `post-insights.spec.ts` found a 321px document at a 320px viewport. Its
   diagnostic attachment `overflow-320.json` identifies only a comment `TIME`
   element (date `11/24/2026`, right edge `321.46875`). The unchanged
   `features/post-comments/CommentItem.tsx` header put an unbroken author and
   date on one flex row. This was initially preserved outside the approved
   title/body editor, then corrected after the user's explicit approval above.
   No Jira task was created and no owner was notified.

Final scoped run `1795541816523-8174c9a4`: 4/4 passed, one Chromium worker,
zero retries, fresh migrated database; normal cleanup completed. Selection:
`own post editing|guest and another author|own drafts remain|the profile lists`.
Log: `e2e/artifacts/pwdrz190-scoped-final.log`; browser report under that run's
`report/index.html`. These passing checks do not erase the full-suite failure.

Final authorized run `1795542238804-e5af17e9`: **62/62 passed**, no filter,
one worker, zero retries, fresh migrated PostgreSQL. The strengthened insights
scenario passed with the 100-character author name at 768/390/320px. Root E2E
prerequisites also passed; launcher result is `exitCode: 0`, including normal
cleanup. Log: `e2e/artifacts/pwdrz190-e2e-approved-final.log` and that run's
`browser-tests.log` / `report/index.html`.

Root `check` and production frontend build passed again after the correction:
`pwdrz190-check-approved-final.log`, `pwdrz190-build-approved-final.log`.
The post-correction full frontend coverage run passed: **124 files, 1370 tests**,
statements 98.39%, branches 94.35%, functions 98.21%, lines 99.15%; all four
unchanged service gates passed. Log:
`pwdrz190-frontend-coverage-approved-final.log`.

No further prerequisite remains from the earlier discussion-layout finding.
No commit, push, Jira/Figma update or PR had been made at implementation sign-off.

## Completion

PWDRZ-190 and the explicitly approved adjacent header correction are complete
locally. Persisted title/body, exact partial requests, cancel, ordinary error
input retention, own drafts, real unauthorized/CSRF rejection, concurrent lock
rejection, cache updates and zero added openings are verified. Desktop/mobile
and light/dark editor evidence is retained. Existing discussion, creation,
profile, search, voting and notification flows passed in the final full gate.

Final source manifest matches the working tree. Existing exported Jira payloads
are preserved; only the added PWDRZ-190 local execution record was updated.
The Git index was unchanged at implementation sign-off. Remote CI and Jira
completion were not claimed. No further implementation approval is pending.

## Authorized commit grouping and publication handoff

After local completion the user explicitly requested logical commits, the
corresponding upstream and branch publication, with no co-author trailers.
The tested source is grouped into four commits:

1. Share post form fields and dialog presentation.
2. Implement editing of own publications, including mutation/cache, component
   and real-stack tests and the scoped profile-count selector correction.
3. Wrap comment authors and dates on narrow screens, with the deterministic
   100-character author-name browser regression.
4. Document behavior, local execution state and acceptance evidence.

Publication targets `origin/PWDRZ-190-edit-own-publication` using a normal push
with upstream setup. The source manifest is unchanged by commit grouping.
Actual remote HEAD, upstream and absence of co-author trailers are verified
after publication and reported in the chat. No PR or merge is requested.
