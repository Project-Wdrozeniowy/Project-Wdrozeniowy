# Orbita frontend

Next.js 16 application served on port `3001` in local development. It communicates with the gateway, not directly with Spring Boot.

The source layout is being migrated under PWDRZ-149. See the [frontend target architecture](../docs/guides/frontend/README.md) for the approved FSD/Next.js ownership plan; some moves are already in progress.

## Quick start

```bash
# Run this block from the repository root.
cp .env.example .env

# If frontend/.env does not already exist, create it from the template.
cd frontend
cp .env.example .env

npm install
npm run dev -- -p 3001
```

Open `http://localhost:3001`. Start the gateway and backend as described in the repository [README](../README.md).

## Quality commands

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
```

Tests use Vitest and React Testing Library. The configured coverage threshold is 65% across lines, functions, branches, and statements. See [docs/guides/testing.md](../docs/guides/testing.md) for repository-wide conventions.

## Authentication and API boundary

- Access tokens stay in memory; refresh tokens are `HttpOnly` cookies. Do not add browser storage for tokens.
- API requests use `src/shared/api/client/api.ts` and `NEXT_PUBLIC_API_URL`; API DTOs are grouped by domain under `src/shared/api/`.
- The forum feed loads paginated data through `src/shared/api/forum/useForumPosts.ts`. The home page shows the first page of the same feed (`src/app/(main)/_ui/HomeFeed.tsx`).

## Evidence

- [package.json](package.json)
- [src/shared/api/client/api.ts](src/shared/api/client/api.ts)
- [vitest.config.ts](vitest.config.ts)
