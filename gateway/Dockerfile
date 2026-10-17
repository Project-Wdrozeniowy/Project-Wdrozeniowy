FROM node:24-alpine AS builder
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY gateway/package.json gateway/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspace gateway --include-workspace-root=false
COPY gateway/tsconfig.json gateway/tsconfig.json
COPY gateway/src gateway/src
RUN npm run build --workspace gateway

FROM node:24-alpine AS runner
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY gateway/package.json gateway/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspace gateway --include-workspace-root=false --omit=dev --ignore-scripts
COPY --from=builder /workspace/gateway/dist ./gateway/dist
EXPOSE 3000
CMD ["node", "gateway/dist/index.js"]
