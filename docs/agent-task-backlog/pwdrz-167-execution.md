# PWDRZ-194 / PWDRZ-167 — backend execution record

## Scope and state

Backend-first plan: PWDRZ-194, then PWDRZ-167. PWDRZ-194 backend acceptance
is verified; PWDRZ-167 remains in progress. Jira issues are not closed.
Branch: `PWDRZ-167-post-engagement`; initial base: `aa7100b`.
Unrelated user changes in AGENTS.md and developer guides are preserved.
No PR or Jira closure is authorized. Local commits and branch publication are authorized.

## PWDRZ-194: public profile privacy

- A public profile previously copied stored personal totals. The new aggregate
  counts public posts and reachable visible comments on public posts. Hidden
  branches and deleted placeholders are excluded; visible replies below deleted
  placeholders remain counted. Private own-profile totals remain unchanged.
- Test-first evidence: `UserServiceTest#publicCountsExcludePrivateActivityWithoutChangingOwnTotals`
  failed before service implementation: expected public postCount 1, actual 2.
- After implementation, UserServiceTest (11) and UserControllerTest (17) passed.
- Migrated fixture: public post with visible root, deleted root/visible reply,
  hidden root/visible reply; plus locked, draft and deleted posts. Public counts
  are (2 posts, 3 comments), become (1,1) on unpublish, restore to (2,3) on
  republish and return to (1,1) on deletion. All five original discussion rows
  survive. Unknown author counts are (0,0).
- `node tools/workspace/backendTest.mjs` passed full Maven verify on an owned
  PostgreSQL 16 container, including PublicProfileStatsRepositoryTest. JaCoCo
  reported all coverage checks met. This applies to the public-profile slice
  before addition of PostVisibilityConcurrencyTest, not the remaining scope.
- JVM/Mockito tests require execution outside the current sandbox: the initial
  sandboxed run stalled; the external run produced the expected assertion failure.
  Docker Engine is now available outside the sandbox.

## Remaining acceptance

- Controlled concurrent moderation/counter tests initially failed in both cases:
  the author's stale PATCH returned success after LOCKED, and score 4 was
  overwritten with 0. Row locking before refresh/authorization now serializes
  update/delete/pin writes. The targeted migrated run passed all 40 tests,
  including both races and post/profile regressions. This targeted run skips
  JaCoCo; final full coverage verification is still required after remaining work.
- First verified implementation commit: `a91012f` (public profile counters).
- Final PWDRZ-194 verification: 371 tests, zero failures/errors/skips, full
  backend verify including JaCoCo gates passed. Log (ignored runtime artifact):
  `.workspace-artifacts/pwdrz-194-verify.log`.
- Managed suite including the expanded publication HTTP scenario passed, exit 0,
  and cleaned up its owned stack. Evidence: `e2e/artifacts/1794692985268-b70806ac`.
  Synthetic author/stranger/guest requests verify unauthorized PATCH 403, missing
  CSRF 403, guest PATCH 401, private reads 404, preserved body/discussion/UP vote,
  public profile and activity removal/restoration, tag/feed/search/recommendation
  exclusion, private own comment total and opening history, and deletion privacy.
  A single explicit opening remains exactly 1 after all status changes and reads.
- E2E TypeScript checking passed. No production UI change was made or claimed.
- PWDRZ-167 summary endpoints, authorization tests, OpenAPI export and generated
  clients are not implemented yet.
- Final combined checks, targeted provisional review and full AC sign-off remain.

## PWDRZ-194 acceptance review

AC 1–3: migrated transition fixtures and managed HTTP scenario passed with
preserved content/engagement, public exclusion/restoration and private history.
AC 4–5: direct authorization/CSRF tests and both controlled PostgreSQL races passed.
AC 6: opening API regressions and managed status/read sequence retain exactly the
one explicit opening. AC 7–8: real migrated PostgreSQL, real gateway suite, full
backend coverage gates and concrete expected/observed evidence above passed.
There is no wire-shape/operation change in 194, so no generated output change.
Status-only PATCH still reuses the existing backend contract. The frontend
placeholder and unrelated category markers remain owned by their original tasks.
No dependency is claimed unblocked by this slice alone; parent 167 is unfinished.
