FROM node:24-alpine AS builder
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY gateway/package.json gateway/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspace frontend --workspace gateway --include-workspace-root --no-audit --no-fund
COPY frontend frontend
COPY gateway/src gateway/src
COPY gateway/tsconfig.json gateway/tsconfig.json
COPY backend/openapi.json backend/openapi.json
RUN npm run api:check --workspace frontend && npm run typecheck --workspace frontend && npm run build --workspace frontend && npm run build --workspace gateway

FROM node:24-alpine AS runner
WORKDIR /workspace
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY gateway/package.json gateway/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspace gateway --include-workspace-root=false --omit=dev --ignore-scripts --no-audit --no-fund
COPY --from=builder /workspace/gateway/dist ./gateway/dist
COPY --from=builder /workspace/frontend/dist ./frontend/dist
EXPOSE 3000
CMD ["node", "gateway/dist/index.js", "--spa"]
