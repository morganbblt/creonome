import { z } from "zod";

export const PrivacyPreferencesSchema = z.object({
  modelTrainingOptIn: z.boolean(),
  keepRushesAfterExport: z.boolean(),
  updatedAt: z.iso.datetime(),
});

export const UpdatePrivacyPreferencesInputSchema = z.object({
  modelTrainingOptIn: z.boolean(),
  keepRushesAfterExport: z.boolean(),
});

export const AccountDeletionRequestSchema = z.object({
  id: z.uuid(),
  status: z.literal("scheduled"),
  requestedAt: z.iso.datetime(),
  scheduledFor: z.iso.datetime(),
});

export const PrivacyStateSchema = z.object({
  preferences: PrivacyPreferencesSchema,
  accountDeletion: AccountDeletionRequestSchema.nullable(),
});

export const PrivacyExportKindSchema = z.enum([
  "creator_dna",
  "projects",
  "everything",
]);

export const PrivacyExportInputSchema = z.object({
  kind: PrivacyExportKindSchema,
});

export const PrivacyExportSchema = z.object({
  kind: PrivacyExportKindSchema,
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.literal("application/json;charset=utf-8"),
  content: z.string().min(1).max(10_000_000),
  createdAt: z.iso.datetime(),
});

export const AccountDeletionRequestInputSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

export const AccountDeletionCancellationSchema = z.object({
  id: z.uuid(),
  cancelled: z.literal(true),
});

export type PrivacyPreferences = z.infer<typeof PrivacyPreferencesSchema>;
export type UpdatePrivacyPreferencesInput = z.infer<
  typeof UpdatePrivacyPreferencesInputSchema
>;
export type AccountDeletionRequest = z.infer<
  typeof AccountDeletionRequestSchema
>;
export type PrivacyState = z.infer<typeof PrivacyStateSchema>;
export type PrivacyExportKind = z.infer<typeof PrivacyExportKindSchema>;
export type PrivacyExportInput = z.infer<typeof PrivacyExportInputSchema>;
export type PrivacyExport = z.infer<typeof PrivacyExportSchema>;
export type AccountDeletionRequestInput = z.infer<
  typeof AccountDeletionRequestInputSchema
>;
export type AccountDeletionCancellation = z.infer<
  typeof AccountDeletionCancellationSchema
>;
