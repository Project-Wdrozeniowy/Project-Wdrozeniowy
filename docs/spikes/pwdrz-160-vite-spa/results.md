# Experiment results

The user-authorized route-structure follow-up is complete at
`4ed8d99443b64fc1b6ae80c60bf19ee2566ddc9b`. Routing/guards now live in `app/router`,
three layouts in `app/layouts`, providers in `app/providers`, ten screens in
`pages`, and reusable post presentation in `widgets/post-feed`. Pathless auth
and ADMIN groups replace two wrapper-only layouts. URLs and product behavior
are preserved. See [the structure record](route-structure.md) and
[current frontend guide](../../guides/frontend/README.md).

For this revision, root check (10 targets), root build (6 targets) and
frontend verified (8 targets, including uncached coverage/codegen/API checks)
passed. All 705 frontend tests pass: 701 retained plus four source-boundary
tests. Coverage: lines 98.20%, branches 93.33%, functions 96.47%; statement gate
also passed. Backend/gateway/E2E source, generated bindings, dependencies and
Nx/CI configuration did not change in this follow-up.

**E2E were skipped at the user's explicit request. Full-stack validate was not
rerun.** The browser/backend and clean-checkout evidence below belongs to the
initial migration at `8094945`; it is not new acceptance evidence for `4ed8d99`.

The migrated production SPA runs through Express and the unchanged real Spring
backend. Local acceptance passed, including all original scenarios. The spike
supports considering **SPA + existing Express** as a practical architecture;
it does not adopt that architecture in develop or authorize a PR/merge.

Initial migration clean-checkout reproduction passed at implementation/test revision
`80949450ed58179e681da6c508402a785a25d57a`. Documentation/tracking commits change
no executable source; exact revisions are recorded in the handover. `git rev-parse
HEAD` identifies the checked-out experimental revision. See also
[verification.json](verification.json).

## References and isolation

- Base/origin develop: `2bd7d6c8d0f24a737304fee07174de5a0c03477a`, verified at kickoff.
- Branch: `PWDRZ-160-vite-spa-spike`, separate worktree from the team's develop.
- Detached baseline source remains unchanged; backend Java/schema/OpenAPI and
  committed generated frontend bindings are unchanged in the experiment.
- Executor: Codex in the isolated experimental worktree. Frontend route shell,
  gateway hosting, packaging and acceptance adaptations belong to this spike.
- User authorized local commits with title/body only and no co-author trailers.
  Origin branch was created at the base. Implementation publication/remote CI
  have not been authorized or performed. No Jira mutation, PR, merge or deployment.
- Node 24.15.0, npm 11.12.1, Java 17 via the existing Maven wrapper workflow,
  Docker Engine 29.4.3, PostgreSQL 16, pinned Playwright 1.64.1 Chromium, Windows.

## Initial migration verification and reproducibility

Commands and safe independent start/stop instructions: [README.md](README.md).
Full local artifacts are ignored beneath the original shared workspace
`D:/Projects/Wrdz/Project-Wdrozeniowy/.workspace-artifacts/pwdrz-160/evidence/`
(`baseline/`, `experiment/`, `verification/`, `route-structure/`), and each worktree's
`e2e/artifacts/<id>/`. This shared evidence directory is outside the experimental
Git root; fresh local runs create their own per-checkout artifacts. They are actual execution evidence, not source
or credentials to be committed. Re-running the commands creates new owned evidence.

| Check                               | Pinned baseline                 | Migrated experiment                                                                 |
| ----------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| Root locked install                 | Passed                          | Passed from clean worktree; unchanged lock after test-only fix                      |
| Root `check` / `build`              | Passed / passed                 | Passed / passed                                                                     |
| Root `test`                         | Passed                          | Passed; frontend 701, gateway 64, backend 313 tests                                 |
| Root tooling tests                  | Passed                          | Passed; Windows child cancellation requires normal process permissions              |
| Contract / Orval                    | Passed                          | 75 generated files reproduce; drift/invalid-input checks pass                       |
| Real production browser + HTTP gate | 10 passed (7 browser + 3 HTTP)  | 16 passed (all original + 6 SPA cases)                                              |
| Root `validate`                     | Individual baseline gates above | All 22 tasks passed, no cached coverage/E2E                                         |
| Negative browser probe              | Existing baseline mechanism     | Real wrong-heading assertion, exit 1, trace/screenshot, cleanup                     |
| Handled interruption                | Preserved launcher handler      | Delivered SIGINT after owned gateway start: exit 130, interrupted true, cleanup     |
| Dev smoke                           | Existing baseline workflow      | UI login, registration via proxy, protected reload, HMR; Ctrl+C closes source ports |
| Packaging / invalidation            | Separate Next runtime required  | Two source revisions serve package-A then package-B; missing build exits 1          |
| GitHub Actions                      | No new baseline run claimed     | Definitions validated; remote jobs unrun                                            |

Coverage retains the same production-source scope and all independent gates:
frontend L/S/B >=85%, F >=80%; gateway L/S >=95%, B >=85%, F >=90%; backend
LINE >=95%, BRANCH >=85%. No new exclusions, retries, skipped scenarios or
lowered thresholds were introduced. Obsolete Next build-env assertions were
replaced by the actual relative-API/build behavior, with existing transport
assertions retained. The net frontend count is 686 baseline - 1 redundant
Next-env case + 16 actual-route cases = 701.

Observed final local coverage: frontend lines **98.37%**, branches **93.23%**,
functions **96.70%**; gateway lines **97.52%**, branches **88.41%**, functions
**93.94%**. Both statement gates also passed. Maven reports 313 tests, zero
failures/errors/skips; JaCoCo LINE **99.01%**, BRANCH **92.22%**.

Traceable production runs:

- Baseline positive: `1793993258833-97eff0a9` (10/10).
- Experimental positive after CSP resolution: `1794055958474-b6dd4bb0` (15/15).
- Negative probe: `1794056321633-32c80f73` (expected assertion failure, exit 1).
- Handled SIGINT: `1794056595998-4ac25ab3` (130, interrupted true).
- Full validate fresh positive after the probe: `1794056726927-33488182` (15/15),
  including hash, keyboard focus and populated mobile settings.
- Final expanded parity suite: `1794057324656-60431215` (16/16), including the
  existing real comment create/reload path.
- Clean-checkout final positive: `1794058270326-13660e12` (16/16), plus all
  22 validate targets at `8094945`; `verification/result-final.json` records exit 0.
- Packaging details: `experiment/package-proof/result.json`; actual image HTTP
  checks show unchanged API/WS 502 behavior and refreshed frontend content.
- Dev details: `experiment/dev-smoke.json`; its owned DB/project and temporary
  `.env` files were removed after verification.

## Route, feature and gateway parity

| Surface                | Evidence / outcome                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10 pages and 5 layouts | Explicit SPA route tree; 16 tests exercise the actual router; all routes direct/reloaded in real Chromium                                                   |
| Auth layouts           | Browser registration/login/invalid credentials preserved; screenshots below                                                                                 |
| Session lifecycle      | Real refresh after reload, logout/guest state, cookie path/HttpOnly/Strict attributes; unchanged focused concurrency/401-retry tests                        |
| Guards and roles       | Guests redirect; USER cannot open admin; synthetic isolated ADMIN can directly open/reload existing admin screen                                            |
| Forum                  | Real publishing, persisted feed, cast/switch/retract vote and personal vote reload; no mocked successful backend boundary                                   |
| Query navigation       | Real tagged 11-post fixture paginates; topic/tag/page/search/type survive reload and Back/Forward; hash retained                                            |
| Keyboard / scroll      | Category Enter retains focus; path navigation focuses main; existing dropdown keyboard and built-in browser scroll restoration retained                     |
| Search / settings      | Actual search endpoint and persisted user; account PATCH and password-change/sign-in semantics pass                                                         |
| Orval / Query / FSD    | Generated output unchanged; transport/cache ownership preserved; no loader/action rewrite or new FSD layers                                                 |
| SPA assets             | Built JS/CSS, MIME/cache, direct dynamic URL, missing-file 404, client not-found view, unsupported-method errors tested                                     |
| API / WS               | Auth/quota/proxy/Set-Cookie/CORS/header/logger tests retained; real image gives API and /ws + /ws/info outage 502; near-prefix browser routes avoid proxies |
| Rate policy            | Actual default 100 API requests then 429/Retry-After; 105 static loads do not spend quota; assets remain available after API quota exhaustion               |
| Security policy        | Helmet kept; no unsafe-eval; Zod configured jitless before schema construction; real CSP/pageerror check passes                                             |
| Docker / Nx / dev      | Combined image builds from secret-free source snapshot, frontend-sensitive packaging inputs and explicit serve dependencies; Vite proxies through Express   |
| Desktop / mobile       | Same fixed fixture, 1280x900 and 390x844; auth/forum/search/profile/settings/dashboard/admin captured; no page errors or required horizontal overflow       |

### Comparable visual samples

These committed samples use the same synthetic account/post and wait for actual
session/data readiness. They are manual visual evidence, not a pixel-diff gate.
Transient loading screenshots were discarded as unsuitable for comparison.
The broader capture sets remain in the local comparison evidence directories.

| Screen          | Next baseline                                        | SPA experiment                                           |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| Login           | [baseline](screenshots/baseline/login-desktop.png)   | [experiment](screenshots/experiment/login-desktop.png)   |
| Forum, desktop  | [baseline](screenshots/baseline/forum-desktop.png)   | [experiment](screenshots/experiment/forum-desktop.png)   |
| Settings, 390px | [baseline](screenshots/baseline/settings-mobile.png) | [experiment](screenshots/experiment/settings-mobile.png) |

Visual inspection found the same layout, typography and populated controls on
these samples. Minor screenshot state/timing differences are not a product or
framework benchmark. No claim about high-load performance or user-perceived
speed follows from passing these checks.

## Actual migration problems and resolutions

1. **Next-specific imports and navigation are mechanical only in part.** Router
   APIs differ in push/replace options, search-param return shape and dynamic
   params. A local pagination helper collided with `navigate`; existing tests
   caught it. Guards, URL semantics and actual history received separate checks.
2. **A SPA needs an explicit composition boundary.** The first runnable version
   retained the old route directories. The requested follow-up replaces them
   with App routing/layouts and independent page slices. Only
   `app/router/routes.tsx` interprets URLs. Data-mode lazy/error/scroll support
   is used without loaders/actions or framework SSR.
3. **Gateway hosting is real application work.** API/WS matching, fallback,
   MIME/cache, missing-build checks, headers and API-only rate scope moved into
   explicit tested Express behavior. Removing Next does not remove those duties.
4. **Strict CSP exposed Zod's eval capability probe.** Forms still worked via
   fallback, but the browser reported script-src violations. Early `jitless`
   configuration resolved the violation; script-src was not weakened.
5. **Packaging changed ownership.** A frontend change now changes the gateway
   image. Docker copies/builds frontend with locked dependencies and the real
   contract; Nx packaging reflects frontend inputs and never caches lifecycle
   evidence. A two-build actual HTTP check rejected stale packaged content.
6. **Readiness is different from API readiness.** The SPA fallback requires an
   HTML navigation Accept header. The original generic fetch readiness caused
   a genuine failed startup gate; it now requests HTML explicitly.
7. **Tests needed a real router boundary.** Component mocks alone would miss
   route-tree defects. Actual-router tests were added; Node 24 native Request
   and jsdom AbortController need matching realms in that test environment.
   A first clean coverage run also exposed an assertion racing lazy module
   initialization. Commit `8094945` adds the missing initialization barrier;
   assertions and retries are unchanged. The failed run is retained alongside
   the successful full clean-checkout validate.
8. **Tooling policy must survive removal of Next config.** Standalone ESLint
   preserves React/hooks and the baseline's selected accessibility rules.
   Applying the entire accessibility preset would introduce unrelated rules;
   it was not used to force a UI refactor into this experiment.
9. **Availability comments can be stale.** The backend/OpenAPI and a real
   baseline comment add/reload flow contradicted old 501 notes. Only those
   directly adjacent notes were corrected; adapters/payloads and acceptance
   ownership were not redesigned.
10. **Runtime ownership is platform-sensitive.** See interruption and Docker
    environment notes below. These failures are not attributed to Vite or Next.

### Clean-checkout record

A separate detached worktree was created at `d6e76f5`, with no copied
node_modules, dist, .env or developer services. npm 11 `ci`, root `check` and
`build` passed. The first full validate failed one new guest-redirect unit case
under cold lazy imports (700 passed/1 failed); its production E2E passed 16/16.
This was not waived or hidden. After the test-only initialization fix, the
clean verification worktree was checked out at `80949450ed58179e681da6c508402a785a25d57a`
with the same byte-identical manifests/lock and the full validate passed 22/22.
No retries, thresholds or production behavior were changed to fix that test.
The failed and final logs/results remain in `evidence/verification/`.

The dev smoke used `COMPOSE_FILE=e2e/compose.yml` and project
`orbita-spike160-dev` with the normal source ports 3000/3001/8080, while its
DB stayed unexposed in a disposable project. This avoided the pre-existing
5432 service; temporary matching environment files were removed afterward.

### Interruption and environment limitations

Handled SIGINT reaches the launcher's existing handler and performs cleanup;
this was verified with in-process SIGINT delivery after its gateway started.
The current Windows/npm terminal Ctrl+C instead terminated the entire process
tree before `finally` (`1794056470457-f1051d2b`). That run has a separately
recorded manual cleanup; it is not counted as successful handled cleanup.
The relevant signal/child-process mechanism is inherited unchanged from the
baseline. A forced terminal/process-tree shutdown, SIGKILL or machine crash
cannot guarantee cleanup. Always use the exact per-run project/runtime record
to remove leftovers; never global prune or a normal developer database reset.

Docker Desktop initially could not start because stale Windows AF_UNIX reparse
points blocked `dockerInference`, then `docker-secrets-engine/engine.sock`.
After user authorization the two runtime directories were preserved and
recreated together. Engine 29.4.3 and subsequent builds/real-stack tests confirm
recovery. Images, volumes, VHDX and the unrelated `messenger-postgres` were not
reset/deleted. Backups remain under LocalAppData; no Docker repair was committed
to project automation. The same failure/workaround is reported in
[Docker desktop-feedback #554](https://github.com/docker/desktop-feedback/issues/554).

## Architectural comparison grounded in the implementation

| Concern                   | Pinned Next + Express                                                   | Implemented SPA + Express                                                  |
| ------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Production runtime        | Next server + Express + Spring                                          | Express serving static SPA + Spring                                        |
| Frontend workspace        | React/FSD/Query/Orval plus Next shell                                   | Same React/FSD/Query/Orval plus Vite and explicit routes                   |
| Data fetching             | Current product data fetched in browser                                 | Same; no browser-to-backend bypass or new BFF                              |
| Server HTML actually used | Layout/page shell and shared metadata, not product-data SSR             | Static entry document; app rendering requires JS                           |
| Routing                   | Files/groups/layout conventions interpreted by Next                     | Explicit App route tree, three layouts, independent page slices            |
| Gateway                   | HTTP cross-cutting/proxy/limited WS                                     | Same functions plus static/fallback/cache/header responsibilities          |
| Delivery                  | Frontend runtime and gateway release independently in principle         | Frontend artifact ships in gateway image; build/release coupling increases |
| Origin/environment        | Separate browser/API origins in the verified baseline                   | One production origin and relative /api; Vite proxy during dev             |
| Unknown browser route     | Next can return an HTTP 404 document                                    | Generic HTML fallback returns 200, client shows not-found                  |
| Server features           | Product-data SSR/SSG/per-post metadata would require new implementation | Same future requirement needs an additional rendering/metadata solution    |
| Verification              | Existing service/browser coverage                                       | Same + SPA hosting, navigation and packaging regressions to maintain       |

The actual simplification is removal of one production Node runtime and the
Next client/server/build conventions that this browser-driven product does not
use for its data. It does **not** remove a source workspace, Java, Express,
Query, auth complexity or API ownership. Static deployment is simple here
because the existing gateway already provides a natural same-origin host, but
that host gains explicit responsibilities and couples frontend/gateway releases.

Potential SSR/SEO benefits are future work in either comparison; they are not
credited as implemented product capabilities. Server-rendered shell/HTTP status
behavior is a real loss and should be accepted consciously. There is no evidence
from this experiment that Zustand ownership, API contract debt or unfinished
features improve merely by changing the frontend build/router.

## Preserved limitations and ownership check

- Post-detail content is still the baseline placeholder. The comments API is
  already implemented: a limited real add/reload parity check passed on both
  architectures (`comparison/comment-parity.json`). Stale 501 claims in its
  adjacent source/test comments were corrected. Full comments acceptance remains
  PWDRZ-67; no fake completed detail flow or backend change was added.
- Dashboard and live-activity sample data remain samples. Notification delivery
  and destination security remain PWDRZ-104; outage/matcher checks do not certify
  a completed realtime protocol. Redis and Socket.IO are retained.
- Profile state/cache consolidation remains PWDRZ-150. No parallel form or
  feedback work was imported. The user-authorized App/pages/post-feed follow-up
  is confined to this experiment; wider FSD/source ownership remains PWDRZ-149's
  boundary. The follow-up does not change team architecture on develop.
- Other retained provisional feature/API markers keep their existing owners
  and prerequisites. No marker states that completion of PWDRZ-160 alone enables
  that product work, and no other ticket is claimed unblocked by migration. Comments were already enabled
  by the backend before this spike; PWDRZ-160 is not that prerequisite.
- Targeted review covers the current key/branch, changed modules and adjacent
  guard/provider/transport/proxy/feature markers. Next-specific Suspense,
  directives, config/type references, navigation mocks and env-only checks were
  resolved within this spike. Unticketed bounded additions are SPA hosting,
  early CSP-compatible validation configuration and route focus behavior, all
  necessary consequences of the requested migration.

## Recommendation

SPA + the existing Express gateway is a demonstrated, reasonable option for
this project's current browser-driven product and limited deployment scope.
It is no longer merely a theoretical alternative. I favor it **if the team
accepts** the explicit hosting/router responsibilities, JS-required initial UI
and coupled frontend/gateway artifact. It provides a more direct execution model
while preserving most existing React/domain work.

Keeping Next remains rational if avoiding adoption work is more valuable, the
team prefers its routing/runtime conventions, or server HTML becomes a concrete
product requirement. This spike does not prove that retaining Next is poor
engineering, nor that hypothetical SSR justifies its runtime today. Both can be
well implemented; the demonstrated tradeoff is bounded simplification versus
explicit responsibilities and lost server rendering/status behavior.

Adoption, any follow-up migration work, remote publication and the final
architecture decision remain with the user. No PR has been prepared/opened.
