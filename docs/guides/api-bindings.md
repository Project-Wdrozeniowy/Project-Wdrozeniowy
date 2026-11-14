# Frontend API bindings (PWDRZ-130)

The implemented backend contract in `backend/openapi.json` owns HTTP models,
parameters, operations and response signatures. Orval **8.46.0**, pinned in the
frontend workspace and root lockfile, generates TanStack Query v5 bindings.
Generated output is committed in `frontend/src/shared/api/generated/`. Never
edit it manually or add application logic there.

A scoped `.gitattributes` rule keeps generated files LF even when a Windows
checkout uses `core.autocrlf=true`; drift comparison remains byte-for-byte.

## Reproduce and update

Use Node 24 and npm 11. Run from the repository root:

```bash
npm ci
npm run api:check
npm run api:generate
npm run api:check
```

Generation uses the committed local contract, not a running Swagger server. It
requires no database, Docker, environment secrets or network after installation.
Both commands generate in a temporary mirror, validate the input and format with
the frontend Prettier configuration. `api:check` compares all relative filenames
and contents, including missing and obsolete files, without repairing the checkout.
`api:generate` replaces only the owned generated directory after successful generation.

After changing a backend API, regenerate its contract first (from `backend/`, with
a persistence-free controller contract context):

```bash
./mvnw test -Dtest=OpenApiContractTest -Dopenapi.contract.update=true
./mvnw test -Dtest=OpenApiContractTest
```

PowerShell uses `./mvnw.cmd` with each `-D...` argument quoted. Review the backend
contract change, then run root `api:generate`. Review the contract, configuration,
generated diff and consumers together. Do not remove invalid schema fields in a
frontend transformer or disable validation to make generation pass.

The generated set follows the published inventory; hidden `501` operations do not
become usable bindings. The inventory includes session CSRF bootstrap, notifications and analytics. Published but
currently unused bindings require no new UI in this task.

PR checks use the merge result with the current base branch. If `develop` gains
implemented endpoints while a frontend PR is open, synchronize the task branch,
regenerate and commit the complete output before expecting its CI to pass. Do not
make CI repair artifacts or validate only an outdated PR head to hide this drift.

## Transport and ownership

- `shared/api/client/orvalTransport.ts` forwards generated requests to the existing
  `ApiClient.request`. It does not create an HTTP instance or manage a session.
- `ApiClient` owns relative `/api`, cookie credentials, deadlines, CSRF single-flight
  and error policy. Orval does not create another transport.
- Public reads may be personalized by a valid session. There is no Bearer injection,
  refresh endpoint, token DTO or automatic mutation replay.
- `shared/auth/session.ts` coordinates profile bootstrap, explicit auth mutations,
  generations and tab reconciliation. Failed profile reads never repeat login.
- Confirmed 401 becomes guest; ambiguous network/5xx failures remain recoverable.
  A 403 does not trigger login. Query does not retry 401/403.
- Error response data is unknown until narrowed. Backend ProblemDetail, gateway
  envelopes, network failures and cancellation are not interchangeable. Cancellation
  does not display a network error toast; feature-specific errors can suppress the
  global toast with request options.

Generated hooks/options own ordinary requests and mutations. Handwritten compositions
remain only for application behavior: feed placeholders, search pages/gating, votes,
profile synchronization and session transitions. `shared/api/forum/usePublishPost.ts`
composes generated mutation options with feed invalidation. Publication success does
not wait for feed refetch, but a caller's async `onSuccess` is awaited and its failure
is handled by the normal mutation lifecycle. Orval 8.46.0's `mutationInvalidates`
wrapper discards that callback's Promise, so this policy stays outside generated code.

Generated runtime bindings are consumed by the existing browser/client tree. Server
Components may use model-only type imports. This task does not introduce SSR token
forwarding, a BFF, a second transport or a shared gateway SDK package.

## Cache and models

Use generated query/mutation key factories and options rather than copying URL-based
keys. All parameters affecting a response belong in its key. `myProfileQueryKey`
adds the signed-in user ID to the generated `/users/me` key. Profile reads/writes use
that scoped key. QueryProvider clears cache on logout/account replacement and refreshes
guest feed queries on sign-in. Do not add unscoped private-profile consumers.

Form schemas and view models remain handwritten: validation limits and UI-only fields
are not replaced by TypeScript DTOs. Request mappers omit confirmation/terms/interests
and retain dirty-field PATCH semantics. TypeScript annotations do not validate runtime
server payloads; transport tests and real-stack tests provide separate evidence.

## Remaining manual contracts

| Exception                           | Reason / owner                                                              |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Category write adapters             | Operations are generated; the handwritten `categoryService` is still in use |
| Comments and provisional pagination | PWDRZ-142/67; page envelope derives from a generated page schema            |
| Tag-page adapter                    | `listTags` is generated; tag posts use the posts `tag` filter, PWDRZ-107    |
| Recommendation adapters             | Operations are generated; handwritten `recommendationService` still in use  |
| AI tag-suggestion adapter           | Operation is generated; the handwritten `aiService` is still in use         |
| WebSocket events                    | Separate non-REST protocol, PWDRZ-104                                       |
| Gateway error envelope              | Not part of the backend OpenAPI; inspect unknown errors safely              |
| Overlapping profile in Zustand      | Existing synchronization retained; consolidation belongs to PWDRZ-150       |

Implemented auth, user, posts, votes, search, notifications and analytics operations
have no handwritten compatibility service wrappers or duplicate wire DTOs. Use the
generated operations/options directly. Omitted notification and analytics query
parameters use backend defaults; generated parameter objects replace the removed
positional analytics signatures. Notification PATCH operations take no request body, and
empty 204 results resolve to `undefined` through the shared transport.

The notification center remains PWDRZ-152 UI work; generated bindings do not imply
that its UI is implemented. Provisional recommendations remain in
`shared/api/recommendation/recommendationClient.ts`, with their own DTO and the
preserved default/custom-limit tests. Both recommendation endpoints are still hidden
501 stubs owned by PWDRZ-146. Provisional adapters cannot be certified by mocked
success fixtures. The managed E2E HTTP case independently verifies both real 501
responses through the gateway; PWDRZ-146 must reconcile that case when publishing
implemented operations. No compatibility re-export under the deleted analytics
module is needed because it had no production consumers.

## Verification and CI

```bash
npm run api:check
npm run test:codegen --workspace frontend
npm run check
npm test
npm run build
npm run test:e2e
```

Production frontend builds use relative `/api` without a public API URL. Root backend tests
and E2E own disposable PostgreSQL/Compose resources; use a running Docker Engine.
E2E uses production frontend snapshots containing committed output, not a live generator
or developer secrets. Root/Nx E2E checks drift before creating the snapshot.

Frontend Nx typecheck and coverage depend on a noncached drift check. Coverage also runs
the Node codegen regression suite. Frontend build includes the backend contract in its
inputs, and its CI path filters include contract-only changes. Existing CI check names,
service gates and all-PR execution remain; required-check governance is PWDRZ-137.

The Node suite generates from a clean temporary fixture twice and proves failures for
modified/deleted/extra output, a changed contract and invalid bearer metadata. Generated
types have compile-time negative cases. Generated operations are exercised through the
real ApiClient with a mocked network, while browser E2E exercises real gateway/backend/DB.

Only the fully generated directory is excluded from frontend line coverage and ESLint;
it remains formatted, typechecked and drift-checked. Handwritten transport, mutator,
compositions and UI stay under unchanged coverage thresholds. See [testing policy](testing.md).
