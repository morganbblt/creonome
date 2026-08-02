import { z } from "zod";

export const SocialProviderSchema = z.enum(["tiktok", "instagram"]);

export const IntegrationStatusSchema = z.object({
  id: z.uuid().optional(),
  provider: SocialProviderSchema,
  configured: z.boolean(),
  status: z.enum([
    "unavailable",
    "disconnected",
    "connected",
    "expired",
    "revoked",
    "error",
  ]),
  displayName: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
  lastSyncAt: z.iso.datetime().nullable().optional(),
});

export const IntegrationsResponseSchema = z.object({
  integrations: z.array(IntegrationStatusSchema).length(2),
});

export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;
export type IntegrationsResponse = z.infer<typeof IntegrationsResponseSchema>;
export type SocialProvider = z.infer<typeof SocialProviderSchema>;
