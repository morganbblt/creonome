FROM node:22-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/config packages/config
COPY packages/contracts packages/contracts
COPY packages/db packages/db
COPY packages/tsconfig packages/tsconfig

RUN pnpm --filter @creonome/config build \
  && pnpm --filter @creonome/contracts build \
  && pnpm --filter @creonome/db build \
  && pnpm --filter @creonome/api build

FROM node:22-slim AS runner

ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /workspace

COPY --from=builder --chown=node:node /workspace/node_modules ./node_modules
COPY --from=builder --chown=node:node /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /workspace/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /workspace/packages/config/package.json ./packages/config/package.json
COPY --from=builder --chown=node:node /workspace/packages/config/node_modules ./packages/config/node_modules
COPY --from=builder --chown=node:node /workspace/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=node:node /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder --chown=node:node /workspace/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=builder --chown=node:node /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder --chown=node:node /workspace/packages/db/package.json ./packages/db/package.json
COPY --from=builder --chown=node:node /workspace/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder --chown=node:node /workspace/packages/db/dist ./packages/db/dist

USER node
EXPOSE 8080

CMD ["node", "apps/api/dist/main.js"]
