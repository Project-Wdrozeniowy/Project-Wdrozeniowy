# PWDRZ-194 / PWDRZ-167 — backend execution record

## Scope and state

Backend-first plan: PWDRZ-194, then PWDRZ-167. PWDRZ-194 backend acceptance
is verified; PWDRZ-167 summaries and their quality gates are verified below.
Jira issues are not closed.
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
- This completed the prerequisite slice before implementation of PWDRZ-167.
  The combined acceptance and final checks are recorded below.

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
No dependency was claimed unblocked by this prerequisite slice alone.

## PWDRZ-167 implementation and acceptance

The public and author summaries have dedicated controller/service/repository
classes instead of extending the large staff analytics classes. This preserves
the planned layers and SQL authorization boundary while isolating their DTOs and
leaving staff operations unchanged. No new schema, audience model or UI was added.

Unit tests preceded the service implementation. The public and owner success
cases each failed against the initial 404 implementation, then passed after
their respective implementation. Red evidence is retained in ignored runtime
logs `pwdrz-167-unit-red.log` and `pwdrz-167-owner-unit-red.log` under
`.workspace-artifacts/`; the final service and migrated API tests pass.

| Requirement / input                                                                                                                        | Expected and observed                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrated public fixture: 3 explicit openings, 3 UP / 1 DOWN, visible root, deleted root with visible reply, hidden root with visible reply | Exactly 5 public fields; views 3, reachable comments 2, score 2 and existing collection cutoff. Owner gets exactly 7 fields, UP 3 / DOWN 1                 |
| Public PUBLISHED/LOCKED reads by guest and author                                                                                          | 200 with the public field set; no private visitor/staff fields                                                                                             |
| Author summary access                                                                                                                      | Guest 401; another member, MODERATOR and ADMIN 404; owner 200 including their draft                                                                        |
| Public draft/deleted/missing and owner deleted/missing                                                                                     | 404 without engagement fields; draft public read is denied even to its author. Malformed public ID is 400                                                  |
| Existing staff operation on a deleted post                                                                                                 | MODERATOR still receives the protected staff response; existing role matrix remains covered                                                                |
| Quiet post, negative score, root plus depths 1–5, unrelated post/comment vote                                                              | Zero activity is 0, negative score is -1, all 6 accessible comments count, unrelated content does not affect the result                                    |
| Repeated safe GET/HEAD sequence                                                                                                            | No change in stored view_count or activity_events; HTTP HEAD has an empty body and protected no-store cache policy                                         |
| Gateway fixture: one visible comment, UP vote, repeated opening ID plus a fresh ID                                                         | Public views 2/comments 1/score 1; owner UP 1/DOWN 0; duplicate opening is not counted twice                                                               |
| Gateway unpublish / republish / delete                                                                                                     | Public 404 while draft, owner retains accumulated counts; republication restores public counts; deletion denies both summary routes                        |
| OpenAPI and clients                                                                                                                        | Separate public/owner schemas and security requirements, required fields and generated operations; api:check matches all 100 generated files               |
| Keyboard / assistive technology criterion                                                                                                  | No controls or UI states are introduced by this backend scope. The frontend implementation and its accessibility acceptance remain with the frontend tasks |

## Combined Definition of Done and check results

All applicable local gates passed on the implementation represented by
`9d5ab5fe4258f4c2ff333ccefa7a608c7fed79d5` and HTTP/documentation commit
`8c22964c183e73f7fabd2c1a2a62934612b547b3`. The managed run captures a
working-tree snapshot: its original run.json HEAD is `0a8eae5`, with the then
uncommitted summary implementation subsequently committed unchanged in the
revisions above. This is local evidence, not a claim that remote CI ran.

| Check                                        | Result / evidence                                                                                                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owned PostgreSQL 16 + full Maven verify      | 376 tests; 0 failures, errors or skips; LINE 98.77%, BRANCH 90.80%; all JaCoCo gates met. `.workspace-artifacts/pwdrz-167-verify.log`                                                                 |
| Root check                                   | All 10 lint/typecheck/format tasks succeeded. `.workspace-artifacts/pwdrz-167-check.log`                                                                                                              |
| Root build                                   | All 6 build/dependency tasks succeeded. `.workspace-artifacts/pwdrz-167-build.log`                                                                                                                    |
| Frontend/gateway coverage and codegen checks | All 4 tasks succeeded with coverage gates. `.workspace-artifacts/pwdrz-167-js-coverage.log`                                                                                                           |
| OpenAPI export and generated bindings        | Contract tests, api:generate and api:check passed; generated source was not edited manually                                                                                                           |
| Managed gateway/browser regressions          | 26 passed, exit 0, owned stack cleaned. `e2e/artifacts/1794693945772-737ba9c3`                                                                                                                        |
| Final strengthened publication fixture       | 26 passed again, exit 0 and cleanup complete. `e2e/artifacts/1794694099373-8d1e89c6`: snapshot at `8c22964` plus the additional title/category/tag preservation assertions committed with this record |
| Workspace and E2E infrastructure tests       | Both tasks succeeded. `.workspace-artifacts/pwdrz-167-infra.log`                                                                                                                                      |
| Final E2E typecheck/format                   | Both tasks succeeded. `.workspace-artifacts/pwdrz-167-e2e-check.log`                                                                                                                                  |
| Migration requirement                        | No table, enum or entity mapping change. New aggregate and concurrency cases use the actual Flyway-managed schema                                                                                     |

An initial full run failed a MockMvc empty-HEAD-body assertion. MockMvc retains
the rendered content, so wire-level body suppression is asserted through the
real gateway instead; the final full backend run and managed HEAD assertion pass.
No production behavior or gate was weakened to accommodate this test boundary.

## Targeted provisional review and handoff

Exact PWDRZ-167/PWDRZ-194 references and provisional markers were reviewed in the
changed analytics/profile/publication paths and directly adjacent API/UI code.
No expired in-scope feature guard or 501 stub needed transition; no unticketed
provisional marker was removed. Staff analytics and private author trends remain
implemented and verified by the existing suite.

PostPage's content placeholder, non-linking/disabled card actions and their tests
remain under PWDRZ-164 and adjacent frontend ownership. Category write stubs
(PWDRZ-141) and remaining comments acceptance (PWDRZ-67) are unchanged. Summary
delivery is not evidence that those frontend paths are complete.

PWDRZ-169's backend dependency is delivered; full readiness remains dependent on
PWDRZ-164 and PWDRZ-168 (both still Ready in the live dependency review). Owner:
Ruslan 82179. PWDRZ-170 already has an implemented author trend, so no new unblock
is claimed for it. No owner notifications, PR or Jira status transitions were sent.
Frontend handoff is documented in `docs/guides/post-engagement.md`.

All eight PWDRZ-194 criteria and all applicable PWDRZ-167 criteria and approved
plan conditions are verified above. Local tracking is done for both issues;
Jira status is deliberately unchanged pending the user's confirmation.
