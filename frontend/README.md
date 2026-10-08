# Orbita frontend

Next.js 16 application served on port `3001` in local development. It communicates with the gateway, not directly with Spring Boot.

## Quick start

```bash
# Run this block from the repository root.
cp .env.example .env

# Create the frontend environment file.
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3000/api" > .env

npm install
npm run dev
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
- All requests use `src/services/api.ts` and `NEXT_PUBLIC_API_URL`.
- The forum service has API adapters, but the feed currently still uses mock data through `src/hooks/usePosts.ts`; see the relevant Jira task before replacing it.

## Evidence

- [package.json](package.json)
- [src/services/api.ts](src/services/api.ts)
- [vitest.config.ts](vitest.config.ts)
