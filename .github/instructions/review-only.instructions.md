---
applyTo: "**"
excludeAgent: "cloud-agent"
---

# PR Review Instructions

For every issue found, use exactly this format:

🛑 Critical — exploitable or data-loss risk, must fix before merge
☢️ Issue — significant problem, should fix this sprint
⭐ Suggestion — improvement worth considering

Each comment must include:
- Label + short title on line 1
- One sentence why it matters
- A concrete fix or example

End every review with a ## Summary paragraph and a ## What is good section listing 2-4 things done well.

---

## Auth Token Storage

☢️ Issue — localStorage JWT storage
New code storing JWT tokens in localStorage or sessionStorage increases XSS exposure; the project direction is httpOnly cookies.
Fix: Remove the storage call and plan for cookie-based auth instead.

```ts
// Flag:
localStorage.setItem('token', ...)
localStorage.getItem('accessToken')
sessionStorage.setItem('jwt', ...)
```

---

## Swagger Exposed in Production

🛑 Critical — Swagger enabled by default
Hardcoding `true` exposes the full API schema in every environment including production, aiding endpoint discovery by attackers.
Fix: Both properties must remain `${SWAGGER_ENABLED:false}`; enable only via a runtime env var.

```properties
# Flag:
springdoc.swagger-ui.enabled=true
springdoc.api-docs.enabled=true
```

---

## Calls to Unimplemented Forum Endpoints

☢️ Issue — Real HTTP calls to non-existent backend API
`forumService.ts` returns static fixtures; calling a real endpoint that has no Spring `@RestController` will cause 404 errors at runtime.
Fix: Keep using static fixtures in `forumService.ts` until the backend forum API is implemented.

```ts
// Flag:
axios.get('/api/posts')
apiClient.post('/api/forum/...')
```

---

## Editing Existing Flyway Migrations

🛑 Critical — Mutating an applied migration
Editing a migration that has already run will cause a Flyway checksum mismatch and block all future application startups.
Fix: Add a new `V5__description.sql` instead; V1–V4 files are immutable.

```
# Flag edits to:
backend/src/main/resources/db/migration/V1__*.sql
backend/src/main/resources/db/migration/V2__*.sql
backend/src/main/resources/db/migration/V3__*.sql
backend/src/main/resources/db/migration/V4__*.sql
```

---

## Java Error Response Not Using ProblemDetail

☢️ Issue — Non-standard error response
Returning raw strings or custom error objects breaks the RFC 9457 contract the frontend depends on and may leak implementation details.
Fix: Use `ProblemDetail.forStatusAndDetail(...)` for all error cases.

```java
// Flag:
return ResponseEntity.badRequest().body("Invalid input");
return Map.of("error", "Not found");
return new CustomErrorDto(...);

// Required:
ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "...");
return ResponseEntity.of(pd).build();
```

---

## Removing Redis or Socket.IO

☢️ Issue — Removing provisioned infrastructure
Redis and Socket.IO are intentionally kept for future caching and real-time notifications; removing them means re-provisioning work later.
Fix: Revert the removal; both placeholders must remain in place.

```yaml
# Flag removal from docker-compose.yml:
redis:
  image: redis:7-alpine
# Flag removal from gateway/package.json:
"socket.io": "..."
```

---

## TypeScript Naming Violations

⭐ Suggestion — Naming convention mismatch
Inconsistent naming violates the project conventions table and makes the codebase harder to scan.
Fix: `PostCard.tsx` for components, `useAuth.ts` for hooks, `AuthResponse` for types (no `I` prefix).

```ts
// Flag:
interface IUser { ... }   // → User
UseAuth.ts                // → useAuth.ts
postCard.tsx              // → PostCard.tsx
```

---

## Deep Cross-Module Relative Imports

⭐ Suggestion — Deep relative import across modules
Traversing `../../../` across module boundaries makes refactoring brittle and is banned by the import rules.
Fix: Use the `@/` alias for any import that leaves the current folder.

```ts
// Flag:
import { User } from '../../../shared/types';
// Required:
import { User } from '@/shared/types';
```

---

## New @/ Alias Without vitest.config.ts Mirror

☢️ Issue — tsconfig alias not mirrored in vitest
Vitest uses its own `resolve.alias` map; an alias in `tsconfig.json` alone silently fails to resolve during test runs.
Fix: Mirror every new `paths` entry from `tsconfig.json` into `vitest.config.ts` under `resolve.alias`.

---

## Missing Tests for New Logic Files

☢️ Issue — New logic file without tests
Untested service, slice, or middleware code reduces coverage below the 65% threshold and lets regressions go undetected.
Fix: Add `__tests__/*.test.ts` alongside each new file in `services/`, `store/slices/`, `providers/`, `middleware/`, or `config/`.
Exempted (no tests required): `app/`, `components/`, `hooks/`, `types/`, `constants/`.

---

## Cross-Service Imports

🛑 Critical — Import crosses service boundary
`frontend/`, `gateway/`, and `backend/` are fully independent; a cross-directory import breaks the isolation contract and will fail in separate CI containers.
Fix: Extract shared types to a published package or duplicate the minimal type; never import across service roots.

```ts
// Flag:
import something from '../../backend/...'
import something from '../frontend/...'
```

---

## OWASP Security Checks

### A01 — Broken Access Control

🛑 Critical — Missing authorization on new controller endpoint
Any new `@GetMapping` / `@PostMapping` without `@PreAuthorize` or a matching `SecurityConfig` permit rule allows unauthenticated access.
Fix: Add `@PreAuthorize("isAuthenticated()")` or explicitly list the path as a public route in `SecurityConfig`.

☢️ Issue — Resource fetched by ID without ownership check
Querying a resource by ID without verifying the caller owns it allows horizontal privilege escalation (IDOR).
Fix: Add the current user's ID as a query condition: `findByIdAndUserId(id, currentUserId)`.

### A02 — Cryptographic Failures

🛑 Critical — Hardcoded secret or credential in source
A hardcoded `JWT_SECRET`, password, or API key committed to the repository allows any reader to forge tokens or access external systems.
Fix: Move the value to an env var, add the key to `.env.example`, and rotate the leaked secret immediately.

### A03 — Injection

🛑 Critical — Native SQL built with string concatenation
String-concatenated SQL bypasses JPA parameterization and enables SQL injection.
Fix: Use `@Query` with named parameters (`:param`) or Criteria API — never `"SELECT ... WHERE id = " + id`.

🛑 Critical — dangerouslySetInnerHTML with unsanitized user input
Injecting raw user content into the DOM enables stored XSS.
Fix: Never pass user-controlled data to `dangerouslySetInnerHTML`; use DOMPurify if HTML rendering is required.

### A05 — Security Misconfiguration

☢️ Issue — CORS origin set to wildcard
A wildcard CORS origin allows any domain to make credentialed requests, undermining the same-origin policy.
Fix: Set `CORS_ORIGINS` to the explicit list of trusted frontend origins.

### A07 — Identification and Authentication Failures

☢️ Issue — Auth endpoint not covered by rate limiter
Login and register endpoints without rate limiting allow credential-stuffing attacks at high velocity.
Fix: Confirm `POST /api/auth/login` and `POST /api/auth/register` pass through the gateway `rateLimiter` middleware.

---

## End-of-Review Template

## Summary
One paragraph: what the PR changes, which issue categories appeared most, and whether it is safe to merge.

## What is good
2-4 specific things done well (e.g. test coverage, correct ProblemDetail usage, clean migration structure, proper @/ imports).
