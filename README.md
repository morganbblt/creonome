# Creonome

Creonome turns creator signals, memory and instinct into production-ready vertical video concepts. The hackathon MVP is a pnpm/Turborepo monorepo with a Next.js App Router frontend, NestJS/Fastify API, Neon Postgres/Auth, approval-gated Mem0 memory and Vertex AI structured generation with local fallbacks. Its multimodal onboarding analyzes private creator files before producing an editable, evidence-backed Creator DNA; explicit creative feedback feeds a reviewable memory queue, completed scripts and storyboards can be exported as portable Markdown packages, and every reserved, spent or released credit remains visible in an immutable ledger. The authenticated Privacy workspace persists consent and retention preferences, provides immediate sanitized JSON exports, links to confirmed source deletion, and records owner-only account-deletion requests with a 24-hour cancellation window.

## Local development

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Populate only the credentials described in [`docs/setup/environment.md`](docs/setup/environment.md). Real `.env` files and private keys are ignored by Git.

## Quality checks

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Deployments

- Web: <https://www.creonome.com>
- API/OpenAPI: <https://creonome-api-909754432431.europe-west9.run.app/api/openapi.json>

TikTok/Instagram and Stripe are not part of the current MVP. See [`docs/implementation/file-plan.md`](docs/implementation/file-plan.md) for the implementation map and remaining manual inputs.
