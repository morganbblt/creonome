# Creonome implementation map

This is the hackathon file map. TikTok and Instagram connections are explicitly deferred; their environment names and disabled backend adapters remain as safe post-MVP placeholders.

## Implemented MVP

```text
.env.example                                      safe credential template
apps/web/app/(auth)/                              Neon Auth pages
apps/web/app/api/auth/[...path]/route.ts          Neon Auth handler
apps/web/src/features/auth/                       Creonome auth shell + Google sign-in
apps/web/app/(app)/today/                         authenticated daily opportunities
apps/web/app/(app)/projects/                      live Neon project index and deliverable workspace
apps/web/app/api/creonome/projects/[id]/upgrade/  authenticated storyboard generation proxy
apps/web/app/(app)/library/                       live private media/script/export library
apps/web/app/(app)/creator-dna/                   live evidence-backed creator profile
apps/web/app/(app)/settings/billing/              mock billing page
apps/web/app/(app)/settings/integrations/         TikTok/Instagram “Coming soon” states
apps/web/app/(app)/settings/privacy/              privacy controls
apps/web/app/(public)/legal/                      public legal pages
apps/web/app/favicon.ico + icon.svg               Creonome brand icons

apps/api/src/bootstrap/                           Fastify, CORS, versioning, OpenAPI
apps/api/src/health/                              liveness and readiness
apps/api/src/modules/auth/                        Neon JWT verification
apps/api/src/modules/workspaces/                  tenant resolution and demo claim
apps/api/src/modules/opportunities/               daily cards, generation, save to project
apps/api/src/modules/projects/                    project read model + credited script→storyboard workflow
apps/api/src/modules/assets/                      private asset registry and mixed library read model
apps/api/src/modules/creator-dna/                 creator profile read model
apps/api/src/modules/credits/                     reserve/commit/release ledger
apps/api/src/modules/jobs/                        asynchronous job state
apps/api/src/modules/memory/                      Mem0 adapter and candidate validation
apps/api/src/modules/ai/                          Gemini structured generation
apps/api/src/modules/uploads/                     private GCS signed uploads
apps/api/src/modules/integrations/                disabled post-MVP social adapters

packages/contracts/                               shared Zod API contracts
packages/config/                                  validated server environments
packages/db/src/schema/                           28-table Drizzle data model
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
- Automated video rendering/export from a completed storyboard.

## Manual inputs still required

- Add Gemini API prepaid credits in Google AI Studio; the current key is valid but its prepaid balance is depleted.
- Verify a Resend sending domain and choose the production `RESEND_FROM_EMAIL`.
- Authorize the Vercel GitHub App for `morganbblt/creonome` if automatic Git deployments are wanted. Manual production deployment already works.
- Choose a branded API domain only if the current Cloud Run URL should be replaced.

The test account is operational but its password is intentionally not committed to the public repository.
