# Architecture and extension guide

This is the developer-facing guide to service boundaries and to placing new
work. For a dated inventory of existing files and implemented capabilities,
use the [codebase reference](../codebase/ARCHITECTURE.md). Code, configuration,
tests, and Flyway migrations determine what works today.

## Service boundaries and request flow

Orbita currently has three independently built services in one repository:

```text
Browser → Next.js frontend (:3001) → Express gateway (:3000)
        → Spring Boot backend (:8080, /api) → PostgreSQL
```

- The frontend owns presentation and client interaction. Browser API requests
  use its shared `ApiClient` and pass through the gateway, not directly to the
  backend.
- The gateway owns cross-cutting HTTP concerns such as CORS, rate limiting,
  access-token verification, and proxying. It must not become a second business
  logic or persistence layer.
- The backend owns HTTP endpoints, authorization, business rules, and database
  access. Flyway migrations own the schema; existing migrations are immutable.
- The gateway and backend intentionally verify access tokens independently.
  Both need the same JWT signing configuration. The frontend keeps access
  tokens in memory and receives refresh tokens only through an HttpOnly cookie.

Redis is provisioned in Compose but has no application consumer yet. Socket.IO
is installed in the gateway but has no active server/client integration. These
are planned capabilities, not evidence that real-time notifications work.
The [capability snapshot](../codebase/ARCHITECTURE.md#21-current-capability-status)
identifies implemented, mocked, stubbed, and deferred paths.

## Backend: extend a cohesive domain

Place a new capability in the package that owns its domain responsibility.
Create a new top-level domain package when the responsibility is distinct,
not merely because a file needs a controller, service, and repository. Add
only the layers the capability actually needs. Controllers describe the HTTP
boundary; services hold business operations; repositories or other approved
persistence adapters handle storage. The backend developer owns the detailed
Java design and its tests.

Spring Data JPA is the default database access path. Native SQL or JDBC is
acceptable when a concrete requirement warrants it, with focused verification
against the real Flyway schema where mapping or SQL behaviour matters. New or
changed tables and PostgreSQL enum mappings require a migrated-schema
round-trip check; see the [testing guide](testing.md).

## Frontend: thin routes, shared transport and state

The current frontend is **not a full Feature-Sliced Design implementation**.
For new work, group cohesive feature UI and data-flow code by responsibility
where it makes the feature easier to extend, but keep the project's central
transport and application-state boundaries:

- `src/app/` contains Next.js route files and route composition. Move form
  submission, data-fetch orchestration, and other feature behaviour into
  components or hooks rather than growing route files.
- `src/services/` owns HTTP requests and the shared `ApiClient`. Do not call
  `fetch` or Axios directly from routes or UI components. Generated contract
  bindings must preserve the existing authentication and refresh behaviour.
- `src/store/` owns shared client/application state, with slices divided by
  cohesive responsibility. Component-local display state can remain local;
  React Query owns server-cache state. Neither is a reason to duplicate the
  same shared state in a page.
- Reusable UI belongs in `src/components/`; a component used only by one
  route or feature may live next to that consumer. Keep imports through public
  interfaces where a feature boundary exists.

These are architectural responsibilities, not a claim that all existing files
already comply. The current login and registration routes still contain
submission orchestration; [PWDRZ-131](https://project-wdrz.atlassian.net/browse/PWDRZ-131)
owns that frontend cleanup.
The [frontend README](../../frontend/README.md) describes running the service.

## Gateway: extend the proxy only when needed

Use the existing proxy and configuration for ordinary backend API routes.
Introduce separate middleware for a genuinely cross-cutting concern; a new
resource does not automatically require its own gateway route and middleware.
Avoid copying backend business decisions into the gateway. A WebSocket or
Socket.IO integration needs an explicit end-to-end design and tests before it
is described as an available product path.

## API contract: current state and target

The agreed target is one published OpenAPI contract for **implemented**
operations. Planned or `501`-only endpoints belong in Jira or a separate design
reference, not among usable published operations. [PWDRZ-127](https://project-wdrz.atlassian.net/browse/PWDRZ-127)
owns the backend cleanup and verification. Until that task is complete, an
operation's appearance in OpenAPI does **not** prove availability: check the
controller, DTO, tests, and observed HTTP response before integrating it.

Frontend contract types are currently maintained by hand.
[PWDRZ-130](https://project-wdrz.atlassian.net/browse/PWDRZ-130) targets
derived types and endpoint bindings from the corrected OpenAPI by the end of
Sprint 5, without bypassing `ApiClient`'s token/cookie/401 handling. This is
technical debt, not an already implemented generator. Changes to an API
operation must keep backend behaviour, the published contract, and frontend
usage aligned; cross-service evidence is part of the [Definition of
Done](README.md#definition-of-done).

## Where to look next

- [Naming conventions](naming-conventions.md) — names and file conventions.
- [Testing guide](testing.md) — local, migrated-schema, and cross-service proof.
- [Codebase architecture](../codebase/ARCHITECTURE.md) and
  [structure map](../codebase/STRUCTURE.md) — dated, factual reference.
