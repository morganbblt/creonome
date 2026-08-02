# Creonome implementation map

This is the hackathon file map. TikTok and Instagram connections are explicitly deferred; their environment names and disabled backend adapters remain as safe post-MVP placeholders.

## Implemented MVP

```text
.env.example                                      safe credential template
apps/web/app/(auth)/                              Neon Auth pages
apps/web/app/api/auth/[...path]/route.ts          Neon Auth handler
apps/web/src/features/auth/                       Creonome auth shell + Google sign-in
apps/web/app/(onboarding)/onboarding/             private multimodal Creator DNA setup
apps/web/src/features/onboarding/                 upload queue, evidence review and editable profile
apps/web/app/(app)/today/                         authenticated cards, action menu and Projects handoff
apps/web/app/api/creonome/opportunities/batches/  idempotent Vertex opportunity generation proxy
apps/web/app/api/creonome/opportunities/[id]/save/ authenticated idempotent project-save proxy
apps/web/app/api/creonome/opportunities/[id]/feedback/ authenticated explicit-feedback proxy
apps/web/src/features/opportunities/              six-signal feedback UI + memory review handoff
apps/web/app/(app)/projects/                      live Neon project index and deliverable workspace
apps/web/app/api/creonome/projects/[id]/upgrade/  authenticated storyboard generation proxy
apps/web/app/api/creonome/projects/[id]/video/    authenticated range-aware private video proxy
apps/web/app/api/creonome/projects/[id]/exports/  authenticated Markdown export proxy
apps/web/app/(app)/library/                       live private library + confirmed source deletion
apps/web/app/api/creonome/assets/[id]/             authenticated source detail/deletion proxy
apps/web/app/(app)/creator-dna/                   live evidence-backed creator profile
apps/web/app/api/creonome/memory-candidates/      authenticated memory review proxies
apps/web/src/features/creator-dna/memory-control  explicit approval queue + decision history
apps/web/app/(app)/credits/                       live balance, capacity, ledger and CSV export
apps/web/app/(app)/settings/billing/              mock billing page
apps/web/app/(app)/settings/integrations/         TikTok/Instagram “Coming soon” states
apps/web/app/(app)/settings/privacy/              persisted privacy, JSON export and deletion-request controls
apps/web/app/api/creonome/privacy/                authenticated privacy/export/deletion proxies
apps/web/app/(public)/legal/                      public legal pages
apps/web/app/favicon.ico + icon.svg               Creonome brand icons

apps/api/src/bootstrap/                           Fastify, CORS, versioning, OpenAPI
apps/api/src/health/                              liveness and readiness
apps/api/src/modules/auth/                        Neon JWT verification
apps/api/src/modules/workspaces/                  tenant resolution and demo claim
apps/api/src/modules/onboarding/                  private GCS analysis + editable DNA persistence
apps/api/src/modules/opportunities/               daily cards, generation, save, revision and explicit feedback
apps/api/src/modules/projects/                    credited Script→Storyboard→Video workflow
apps/api/src/modules/projects/video/              Veo, GCS and deterministic resilience providers
apps/api/src/modules/exports/                     recorded, downloadable project Markdown packages
apps/api/src/modules/assets/                      tenant-scoped asset registry, GCS deletion and mixed library
apps/api/src/modules/creator-dna/                 creator profile read model
apps/api/src/modules/credits/                     reserve/commit/release ledger
apps/api/src/modules/jobs/                        asynchronous job state
apps/api/src/modules/memory/                      Mem0 adapter, approval queue and review history
apps/api/src/modules/ai/                          Vertex AI structured generation + local fallback
apps/api/src/modules/uploads/                     private GCS signed uploads
apps/api/src/modules/integrations/                disabled post-MVP social adapters
apps/api/src/modules/privacy/                     audited preferences, sanitized exports and owner-only deletion requests

packages/contracts/                               shared Zod API contracts
packages/config/                                  validated server environments
packages/db/src/schema/                           30-table Drizzle data model
packages/db/drizzle/                              applied Neon migrations
packages/db/src/demo/                             Nova Sainte demo data
infra/gcp/                                        Cloud Build, Cloud Run and private media CORS config
vercel.json                                       Vercel monorepo config
docs/setup/environment.md                         credentials and provider status
```

## Deployed services

- Web: `https://www.creonome.com` (`https://creonome.vercel.app` remains an alias)
- API: `https://creonome-api-909754432431.europe-west9.run.app`
- Database/Auth: Neon project `Creonome`, production branch
- API runtime: Cloud Run Paris (`europe-west9`)

## Deferred after the MVP

- TikTok and Instagram OAuth, insights ingestion and publishing.
- Stripe billing; the current billing experience is intentionally synthetic.
- Lyria generation while its preview access and product flow are finalized.
- Multi-clip editing and timeline assembly beyond the current 8-second Veo/fallback render.
- Automatic 30-day source retention and final account/media deletion workers; the MVP records the preferences and cancellable request but does not execute those destructive background jobs.

## Manual inputs still required

- Monitor Vertex AI Veo quota/cost and keep Gemini API as an explicitly selectable secondary backend.
- Verify a Resend sending domain and choose the production `RESEND_FROM_EMAIL`.
- Authorize the Vercel GitHub App for `morganbblt/creonome` if automatic Git deployments are wanted. Manual production deployment already works.
- Choose a branded API domain only if the current Cloud Run URL should be replaced.

The test account is operational but its password is intentionally not committed to the public repository.
