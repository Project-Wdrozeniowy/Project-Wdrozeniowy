# PWDRZ-169 execution record

Date: 2026-11-23. Owner: Ruslan 82179. Branch: `PWDRZ-169-post-insights`, tracking
`origin/PWDRZ-169-post-insights`. The user approved the
[implementation plan](pwdrz-169-implementation-plan.md), local commits and remote
publication. No PR, merge, Jira/Figma update or owner notification was requested.

## Delivered result

The readable post page now shows a public or author engagement card between the
article and discussion. It uses the existing generated public/owner operations,
transport, session lifecycle and theme primitives. No backend, OpenAPI, generated
bindings, schema, gateway or dependency change was necessary.

Public Details reveals accumulated openings and their UTC collection date.
The author sees UP/DOWN counts as well, including their own draft. Staff is not
treated as the author of other posts. Zero values, loading and unavailable data
are distinct; errors never display raw server/transport diagnostics. The summary
labels reachable visible comments including replies, separately from root threads.

Refresh updates both summary and article without remounting the discussion or
clearing its unsent draft. Accepted votes and comment mutations invalidate the
affected post's summaries. An old initial read overtaken by a mutation is cancelled.
Account-scoped query keys, post/account component identity, generation guards and
existing cache clearing prevent old owner results from resurfacing.

## Source and run identity

- Base develop: `d2daaefd23cd02e569f8e5865e67e6770292ee7c`.
- Query foundation: `65fc3c8d2dd876bdc17b69a38c7a1dfbf757b264`.
- Final application implementation: `27832f08a9ce9715c7bacc33ddb7307c83c8b52b`.
- Browser acceptance and final unit-test import conventions:
  `975ca065355f3a66a3b22a206507512a0cf89d8e`.
- Final managed run: `e2e/artifacts/1795463299261-830bc663`.
- Its exact browser-spec Git blob is `a106b48a3eccc5f09bde624047031cc395e74562`,
  identical to `975ca06:e2e/tests/post-insights.spec.ts`.

The launcher's run.json records the then-current test-commit label `f26d62e` and a
working-tree source snapshot. That unpublished test commit was subsequently
amended to include the already-tested screenshot-centering change. The application
implementation remained unchanged from `27832f0`; the browser-spec blob above
identifies the exact executed test. This record does not pretend that the run
started on the later amended commit or on this documentation commit.

## Environment and commands

Windows, Node 24.15.0, bundled npm 11.12.1, Docker Engine 29.4.3 and pinned Playwright
1.64.1 Chromium. Global npm was 12, so commands used Node's bundled npm CLI without
changing global configuration. Dependencies were installed from the root lockfile.

Commands below were invoked through
`node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js"` in place of `npm`:

```powershell
npm run typecheck --workspace frontend
npm run lint --workspace frontend
npm run format:check --workspace frontend
npm run test:coverage --workspace frontend -- --maxWorkers=4
npm run build --workspace frontend
npm run api:check
npm run test:codegen --workspace frontend
npm run typecheck --workspace orbita-e2e
npm run format:check --workspace orbita-e2e
npm run test:infra --workspace orbita-e2e
npm test --workspace orbita-e2e
```

The Nx wrapper is not reported as passed. Initial sandboxed Nx startup reported
Windows socket/pipe errors; documented direct workspace commands ran the service
checks and the same managed E2E launcher. No Nx/CI/service-gate configuration was
changed. A previously interrupted owned E2E stack was explicitly identified through
run.json and Docker project labels, logged and removed before the final runs. An
attempt while its ports were occupied correctly refused to reuse that stack.

## Check results

| Check                                | Observed result                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Frontend typecheck, lint, formatting | Passed on the final source/test imports; `.workspace-artifacts/pwdrz-169-frontend-static.log`                   |
| Complete frontend coverage suite     | 120 files, 1324 tests passed; no skips; `.workspace-artifacts/pwdrz-169-frontend-coverage.log`                  |
| Coverage                             | Statements 98.50%, branches 94.72%, functions 98.35%, lines 99.12%; all four existing gates passed              |
| Final production build               | Passed; `.workspace-artifacts/pwdrz-169-frontend-build.log`                                                     |
| Contract/binding drift               | 102 generated files match; `.workspace-artifacts/pwdrz-169-api-check.log`                                       |
| Code-generation infrastructure       | 1 test passed; `.workspace-artifacts/pwdrz-169-codegen.log`                                                     |
| E2E typecheck/format/infra           | Passed; 3 infrastructure tests passed                                                                           |
| Final full managed stack             | 52 tests passed, one worker, zero retries; browser-tests.log and `.workspace-artifacts/pwdrz-169-e2e-final.log` |
| Cleanup                              | Final launcher exit 0; owned containers/network/local images removed in stack-cleanup.log; runtime removed      |
| Targeted import check                | All 33 query/card/mutation tests passed after replacing parent-folder test imports with project aliases         |

Coverage scope/exclusions/thresholds, test timeouts and Playwright retry policy were
not relaxed. The first coverage run found a props-interface naming violation,
which was corrected. A heavily parallel run timed out in existing routing tests;
the complete suite passed with four workers and the same assertions/timeouts.

A preliminary complete E2E run (`1795462360733-ceb3fcdb`) passed 52 tests. Adding
the intermediate 768px check exposed that an immediate post-resize measurement
could precede settled layout. The assertion now polls the actual page geometry,
with overflow-element diagnostics on failure. This is observable-state waiting,
not a test retry. Both subsequent complete passing runs include the 768px check;
the final run also centers the mobile screenshot between fixed navigation bars.

## Concrete acceptance evidence

The final scenario's synthetic post ID was 27 in its fresh disposable database.
It used real registration/login, post, vote, comment and opening APIs. Browser
success responses were not mocked. A deliberate request abort tested recovery;
unrouting then restored the real endpoint.

| Input/action                           | Expected and observed                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Guest, initial UP/DOWN balance         | Public score 0; no author endpoint request or private breakdown                                                             |
| Reader votes UP                        | Article and public summary show score 1; persisted totals become UP 2 / DOWN 1                                              |
| Reader creates a root and reply        | Visible comments 2; discussion remains 1 root thread                                                                        |
| Author signs in                        | Owner card shows score 1, UP 2 / DOWN 1, comments 2 and openings 2                                                          |
| Three Refresh activations              | Both summary and article GET 200; stored `[view_count, POST_VIEWED rows]` remains `[2,2]` before and after; no opening POST |
| Reload and different-account sign-in   | Persisted totals remain; the other account sees no owner breakdown; its direct owner GET is 404                             |
| Reader deletes the root                | Deleted placeholder remains; its visible reply is still shown and counted; owner/public commentCount becomes 1              |
| Failed owner read, then keyboard Retry | Fixed error with article still available; real retry succeeds; focus returns to Refresh; unsent comment draft remains       |
| Another session votes, then Refresh    | Both article and summary change from score 0 to 1; unsent draft remains                                                     |
| Author unpublishes through API fixture | Owner card remains available for the draft; after logout, direct post navigation is not found and no insights render        |
| 768/390/320px and dark card            | Settled page has no horizontal overflow; actual mobile card screenshot inspected                                            |

Final persisted owner response after root deletion:

```json
{
  "postId": 27,
  "viewCount": 2,
  "commentCount": 1,
  "voteScore": 1,
  "collectedFrom": "2026-11-23T19:48:30.184763Z",
  "upvoteCount": 2,
  "downvoteCount": 1
}
```

Provider/transport integration tests additionally verify logout with a pending
owner response, same-account background reconciliation, replacement by a different
account, and an expired owner request. Card tests cover negative/zero values,
single-vote labels, UTC date boundaries, 401/403/404/429/5xx/network errors,
partial refresh failure, duplicate activation, post changes and focus recovery
without stealing focus from a reader who moved away.

## Visible artifacts and accessibility limits

The final run's `report/index.html` contains named attachments:

- `insights-public-desktop.png`:
  `report/data/0ab52284f87218f30e8bc9060b3342d2622bb61e.png`.
- `insights-author-desktop.png`:
  `report/data/94bf156f4f158b7382c5bcecc0c6b26ad72bbfa9.png`.
- `insights-author-phone-dark.png`:
  `report/data/997c889a3d6f5002014c0eb50bee37b6f97f91cc.png`.
- `insights-error.png`:
  `report/data/8ff41b334aeee785ec2636d015f255efb098efd2.png`.
- `insights-evidence.json`: actual persisted response and before/after counts.
- `insights-accessibility.txt`: browser accessibility tree with a named region,
  heading, Refresh button, status and labelled metric definitions.

The desktop and final unobscured mobile screenshots were visually inspected.
Keyboard/disclosure/retry focus, live-region markup, accessible names and the
browser accessibility tree were verified. NVDA is not installed; no manual
screen-reader speech verification was performed. This is not a WCAG conformance
or legal-compliance certification. Artifacts remain local and ignored by Git;
these results do not assert that remote CI has run.

## Targeted provisional review and remaining ownership

Exact-key and adjacent provisional-marker checks covered post UI, engagement
queries, vote/comment compositions, the comments integration boundary and scoped
instructions. No expired PWDRZ-169 guard or stub required enabling/removal. No
unticketed provisional mechanism was resolved. Existing PWDRZ-67 acceptance notes
and unrelated stub-error fixtures were not rewritten as part of this delivery.

- PWDRZ-166 (Dzmitry Varonin): SPA navigation/reload opening delivery is still
  absent from the execution base. The synthetic opening API fixture proves the
  summary behavior, not browser opening delivery. Insights refresh/disclosure
  contains no recording call.
- PWDRZ-171 (Darya Atroshchyk): daily/compact trends, periods and daily tables remain
  outside this task. The owner card deliberately contains only implemented totals.
- PWDRZ-176 (Ruslan 82179): this supplies its insights dependency, but other
  prerequisites remain; the complete journey is not declared unblocked.

The executable backlog export has no PWDRZ-169 issue entry, so no historical Jira
payload was changed or fabricated. This execution record provides local tracking.
No notifications or Jira status transitions were sent.
