# Credentials and environment setup

Creonome uses one committed template, [`.env.example`](../../.env.example), and keeps populated environment files outside Git. No API secret may use a `NEXT_PUBLIC_` prefix.

## MVP credential ownership

| Credential                                  | Owner                     | Per user?      | Production store/status                                                 |
| ------------------------------------------- | ------------------------- | -------------- | ----------------------------------------------------------------------- |
| `GEMINI_API_KEY`                            | Creonome/GCP              | No             | Secret Manager; validate model access and quota before each deployment   |
| `MEM0_API_KEY`                              | Creonome                  | No             | Secret Manager; live read smoke test passed                             |
| `RESEND_API_KEY`                            | Creonome                  | No             | Secret Manager; verified sender/domain still required                   |
| `DATABASE_URL`                              | Neon                      | No             | Secret Manager, pooled endpoint                                         |
| `NEON_AUTH_BASE_URL` / `NEON_AUTH_JWKS_URL` | Neon branch               | No             | Vercel/Cloud Run and Secret Manager                                     |
| `NEON_AUTH_COOKIE_SECRET`                   | Creonome                  | No             | Vercel and Secret Manager                                               |
| Google sign-in                              | Neon Auth shared provider | OAuth per user | Enabled; no Creonome Google client secret required for the MVP          |

TikTok and Meta environment names remain in `.env.example` only as post-MVP placeholders. Those future client credentials will belong to the Creonome developer applications, while access/refresh tokens will be issued per consenting creator and stored encrypted. `FEATURE_SOCIAL_CONNECTIONS=false` is the production MVP setting.

## Provisioned infrastructure

- GCP project `creonome` (`909754432431`), billing enabled.
- Cloud Run API in `europe-west9` (Paris).
- Artifact Registry `europe-west9-docker.pkg.dev/creonome/creonome-containers`.
- Private bucket `gs://creonome-909754432431-media` with uniform access and public-access prevention.
- Cloud Tasks queue `creonome-generation` in `europe-west1` because Paris is unavailable.
- Runtime service accounts `creonome-api`, `creonome-worker`, and `creonome-gemini`.
- Secret Manager entries for Gemini, Mem0, Resend, Neon database/auth, reserved social credentials and social-token encryption.

For local Google client libraries, use Application Default Credentials instead of a downloaded service-account key:

```bash
gcloud auth application-default login
```

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
