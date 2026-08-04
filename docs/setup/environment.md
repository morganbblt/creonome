# Credentials and environment setup

Creonome uses one committed template, [`.env.example`](../../.env.example), and keeps populated environment files outside Git. No API secret may use a `NEXT_PUBLIC_` prefix.

## MVP credential ownership

| Credential                                  | Owner                     | Per user?      | Production store/status                                                  |
| ------------------------------------------- | ------------------------- | -------------- | ------------------------------------------------------------------------ |
| `GOOGLE_CLOUD_PROJECT` / `VERTEX_AI_MODEL`  | Creonome/GCP              | No             | Cloud Run identity; primary structured and multimodal generation         |
| `GEMINI_API_KEY`                            | Creonome/GCP              | No             | Secret Manager; optional Google AI Studio fallback for local development |
| `VIDEO_PROVIDER` / `VEO_BACKEND`            | Creonome                  | No             | Cloud Run env; Veo-first with a mandatory deterministic fallback         |
| `MEM0_API_KEY`                              | Creonome                  | No             | Secret Manager; live read smoke test passed                              |
| `RESEND_API_KEY`                            | Creonome                  | No             | Secret Manager; verified sender/domain still required                    |
| `DATABASE_URL`                              | Neon                      | No             | Secret Manager, pooled endpoint                                          |
| `NEON_AUTH_BASE_URL` / `NEON_AUTH_JWKS_URL` | Neon branch               | No             | Vercel/Cloud Run and Secret Manager                                      |
| `NEON_AUTH_COOKIE_SECRET`                   | Creonome                  | No             | Vercel and Secret Manager                                                |
| Google sign-in                              | Neon Auth shared provider | OAuth per user | Enabled; no Creonome Google client secret required for the MVP           |

TikTok and Meta environment names remain in `.env.example` only as post-MVP placeholders. Those future client credentials will belong to the Creonome developer applications, while access/refresh tokens will be issued per consenting creator and stored encrypted. `FEATURE_SOCIAL_CONNECTIONS=false` is the production MVP setting.

## Provisioned infrastructure

- GCP project `creonome` (`909754432431`), billing enabled.
- Cloud Run API in `europe-west9` (Paris).
- Artifact Registry `europe-west9-docker.pkg.dev/creonome/creonome-containers`.
- Private bucket `gs://creonome-909754432431-media` with uniform access and public-access prevention.
- Cloud Tasks queue `creonome-generation` in `europe-west1` because Paris is unavailable.
- Runtime service accounts `creonome-api`, `creonome-worker`, and `creonome-gemini`.
- Vertex AI enabled; `creonome-api` has `roles/aiplatform.user` plus bucket-scoped `roles/storage.objectUser`. The Vertex AI service agent also has bucket-scoped `roles/storage.objectUser` for provider-managed output.
- Secret Manager entries for Gemini, Mem0, Resend, Neon database/auth, reserved social credentials and social-token encryption.

For local Google client libraries, use Application Default Credentials instead of a downloaded service-account key:

```bash
gcloud auth application-default login
```

## Veo and resilient video rendering

`VIDEO_PROVIDER=auto` is the production default. With `GOOGLE_CLOUD_PROJECT` configured, `VEO_BACKEND=auto` selects Vertex AI Veo through the Cloud Run service identity; `VEO_BACKEND=gemini` selects the server-only `GEMINI_API_KEY` route. The API polls the long-running operation for at most `VEO_TIMEOUT_MS`, validates the complete MP4, and then writes it to the private media bucket. Any model, quota, permission, timeout, response, download or storage failure automatically selects the committed deterministic MP4 instead. `VIDEO_PROVIDER=deterministic` is useful for local development and demos without provider spend. `VIDEO_PROVIDER=veo` still preserves the mandatory fallback; it expresses provider preference, not permission to break the workflow.

Creator DNA accepts one optional private people-reference image (JPG, PNG or WebP, up to 20 MB). It is stored as a workspace-scoped source asset; Veo receives it as an asset reference and the Gemini API adapter reads it as validated inline bytes. Replacing or removing the image changes only the reference marker—the original source remains available in the private library. DNA trait corrections create a new `creator_dna_versions` row so the previous model remains auditable.

The Cloud Run service account needs:

- `roles/storage.objectUser` on `gs://creonome-909754432431-media`;
- `roles/aiplatform.user` for Vertex Veo generation;
- `roles/secretmanager.secretAccessor` on the explicitly mounted secrets.

No downloaded service-account JSON is used. See [`../architecture/video-rendering.md`](../architecture/video-rendering.md) for failure and credit semantics.

## Asynchronous generation (Cloud Tasks)

Opportunity batch generation, script upgrades, storyboard upgrades and video
rendering all reserve credits synchronously, then hand the actual generation
work off to the `creonome-generation` Cloud Tasks queue (`GCP_TASKS_LOCATION`,
`GCP_TASKS_QUEUE`) instead of running inline, so requests never risk the
Cloud Run timeout. The queued task calls back into this same API's internal
handler endpoints (`/api/v1/internal/opportunity-jobs/:jobId/execute` and
`/api/v1/internal/project-jobs/:jobId/execute`) at `WORKER_BASE_URL` (falls
back to `API_URL`), authenticated with `INTERNAL_JOB_TOKEN` the same way as
`POST /api/v1/privacy/account-deletion/execute-due`. Clients poll
`GET /api/v1/jobs/:id` until the job reaches a terminal status
(`succeeded`, `failed_retryable`, `failed_final`, `cancelled`), then re-fetch
the parent opportunity/project for the finished content.

If `GOOGLE_CLOUD_PROJECT`, `GCP_TASKS_LOCATION`, `GCP_TASKS_QUEUE`,
`WORKER_BASE_URL`/`API_URL` or `INTERNAL_JOB_TOKEN` are not configured (e.g.
local dev without GCP credentials), enqueueing fails fast with a clear 503
instead of the request hanging or the process crashing, and any reserved
credits are released.

## Neon Auth

The production branch has email/password enabled without mandatory verification, Google enabled through Neon shared credentials, localhost enabled, and both `https://www.creonome.com` and `https://creonome.vercel.app` in its trusted-domain whitelist. The Next.js server obtains the Neon Auth JWT and forwards it to the NestJS API.

## Billing modes

`BILLING_MODE=mock` and `FEATURE_STRIPE=false` are the hackathon defaults. Payment-changing controls remain disabled. Stripe variables are reserved but unused.

## Post-MVP social credentials

Do not request TikTok or Meta keys for the current MVP. Later, create one developer app per platform for Creonome, then add its secrets through standard input so they do not enter shell history:

```bash
gcloud secrets versions add tiktok-client-key --project=creonome --data-file=-
gcloud secrets versions add tiktok-client-secret --project=creonome --data-file=-
gcloud secrets versions add meta-app-id --project=creonome --data-file=-
gcloud secrets versions add meta-app-secret --project=creonome --data-file=-
```
