# PWDRZ-99 execution

Base: `4c8f082807a264d5b3fbe377c1f98a4c99aff540`, verified equal to fetched
`origin/develop` on 2026-11-08. Branch: `PWDRZ-99-session-http-boundary`.
Local commits are authorized; no push or Jira mutation is authorized.

## Verification boundaries

The user explicitly deferred E2E and real-database tests during development.
Unit tests, in-memory repository characterization, static checks and builds
remain applicable. PostgreSQL migration/concurrency, HTTPS cookies and managed
browser acceptance must be reported as unrun until separately executed; H2
and mocked success are not PostgreSQL or browser evidence.

## Session repository characterization

`mvnw.cmd --batch-mode -Dtest=JdbcSessionRepositoryTest test`: 5 tests passed.
Boot resolved Spring Session JDBC/core 4.0.2 without a version override.

The real repository with in-memory H2 demonstrates:

- A late update does not reinsert a deleted session.
- An old request's ordinary save can restore an old session ID after rotation.
- Deleting the old ID after rotation leaves the new row reachable.
- Idle expiry is checked without physical cleanup.
- A new repository instance reads persisted serialized attributes.

The corresponding migrated PostgreSQL cases are prepared in
`JdbcSessionConcurrencyTest` but have not run. No extra lifecycle table is
introduced. Standard Spring fixation protection creating a new session row
is preferred over changing the existing row's ID; authentication transitions
still require explicit concurrency verification.

## Context map

The reviewed implementation plan maps authentication/controller/security,
users/password revocation, JDBC/Flyway, API/Orval, frontend transport/providers/
forms/guards/cache, Gateway proxy/errors/limits and env/startup/E2E consumers.
Existing ownership/resource checks and managed test infrastructure are reused.
PWDRZ-104 retains real-time/destination/lifecycle work; PWDRZ-150 retains full
profile-state consolidation; PWDRZ-161 retains Remember Me. The agreed release
is one coordinated cutover with forward-only legacy schema removal.
