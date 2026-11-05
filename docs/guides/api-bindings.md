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
the normal test PostgreSQL environment configured):

```bash
./mvnw test -Dtest=OpenApiContractTest -Dopenapi.contract.update=true
./mvnw test -Dtest=OpenApiContractTest
```

PowerShell uses `./mvnw.cmd` with each `-D...` argument quoted. Review the backend
contract change, then run root `api:generate`. Review the contract, configuration,
generated diff and consumers together. Do not remove invalid schema fields in a
frontend transformer or disable validation to make generation pass.

The generated set follows the published inventory; hidden `501` operations do not
become usable bindings. After PWDRZ-144/145 the inventory contains 32 operations
and generates 61 files, including notifications and analytics. Published but
currently unused bindings require no new UI in this task.

PR checks use the merge result with the current base branch. If `develop` gains
implemented endpoints while a frontend PR is open, synchronize the task branch,
regenerate and commit the complete output before expecting its CI to pass. Do not
make CI repair artifacts or validate only an outdated PR head to hide this drift.

## Transport and ownership

- `shared/api/client/orvalTransport.ts` forwards generated requests to the existing
  `ApiClient.request`. It does not create an HTTP instance or manage a session.
- `ApiClient` owns the gateway base ending in `/api`, timeout, bearer injection,
  credentials, error policy and one retry after a shared rotating refresh. Orval's
  empty base URL prevents duplicating `/api`.
- Public reads still receive a bearer when available: responses can contain personal
  `myVote`/`subscribed` fields. Public does not mean anonymous-only.
- Access tokens remain in memory. Refresh tokens stay in HttpOnly cookies and are
  never generated request-body fields or application arguments.
- Low-level `refreshAccessToken` deliberately uses the same private HTTP instance
  and a generated response DTO. It remains outside Query caching and generated
  runtime imports to avoid a transport → generated operations → transport cycle.
- `shared/auth/loadProfile.ts` preserves pending-token cleanup (PWDRZ-155). Sign-in,
  sign-up and reload establish the session only after profile loading succeeds.
- A failed server logout keeps the current session because the cookie may still be
  valid. Terminal transport 401 ends the session; Query does not retry it again.
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

| Exception                             | Reason / owner                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Category write requests               | Hidden `501` endpoints, PWDRZ-141                                                                                                                 |
| Comments and provisional pagination   | PWDRZ-142/67; page envelope derives from a generated page schema                                                                                  |
| Tag-list adapters                     | Hidden `501` endpoints, PWDRZ-143/107; existing published Tag DTO is reused                                                                       |
| Legacy notification adapters/fixtures | No production consumer; PWDRZ-144 backend is implemented and generated bindings are authoritative; UI integration remains PWDRZ-152               |
| Legacy analytics adapters/fixtures    | No production consumer; PWDRZ-145 backend is implemented and generated bindings are authoritative; planned fixtures do not certify UI integration |
| Recommendations and AI                | Hidden `501` endpoints, PWDRZ-146/147                                                                                                             |
| WebSocket events                      | Separate non-REST protocol, PWDRZ-104                                                                                                             |
| Gateway error envelope                | Not part of the backend OpenAPI; inspect unknown errors safely                                                                                    |
| Overlapping profile in Zustand        | Existing synchronization retained; consolidation belongs to PWDRZ-150                                                                             |

There are no compatibility service wrappers for implemented auth/user/posts/votes/search
operations. Provisional forum adapters retain their explicit markers and cannot be
certified by mocked success fixtures.

## Verification and CI

```bash
npm run api:check
npm run test:codegen --workspace frontend
npm run check
npm test
npm run build
npm run test:e2e
```

Production frontend builds need an explicit `NEXT_PUBLIC_API_URL`. Root backend tests
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
