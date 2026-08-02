import { z } from "zod";

export const OnboardingStatusSchema = z.enum([
  "pending",
  "in_progress",
  "complete",
]);

export const OnboardingStepSchema = z.enum([
  "source",
  "upload",
  "profile",
  "complete",
]);

export const OnboardingRepresentativenessSchema = z.enum([
  "representative",
  "not_my_style",
  "reference_only",
]);

const ShortListSchema = z.array(z.string().trim().min(1).max(120)).max(12);

export const OnboardingAssetInsightSchema = z.object({
  summary: z.string().trim().min(12).max(800),
  disciplines: ShortListSchema,
  genres: ShortListSchema,
  creativeSignature: z.string().trim().min(8).max(600),
  themes: ShortListSchema,
  targetAudience: z.string().trim().min(8).max(500),
  boundaries: ShortListSchema,
  evidence: z.array(z.string().trim().min(3).max(240)).min(1).max(12),
});

export const OnboardingProfileSchema = z.object({
  stageName: z.string().trim().min(1).max(80),
  disciplines: ShortListSchema.min(1).max(8),
  genres: ShortListSchema.min(1),
  creativeSignature: z.string().trim().min(8).max(600),
  themes: ShortListSchema.min(1),
  targetAudience: z.string().trim().min(8).max(500),
  boundaries: ShortListSchema,
});

export const OnboardingAssetSchema = z.object({
  id: z.uuid(),
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.string().trim().min(1).max(120),
  byteSize: z.number().int().nonnegative(),
  status: z.enum(["uploaded", "analyzing", "ready", "failed"]),
  representativeness: OnboardingRepresentativenessSchema,
  analysis: OnboardingAssetInsightSchema.nullable(),
  errorMessage: z.string().trim().min(1).max(500).nullable(),
  createdAt: z.iso.datetime(),
});

export const OnboardingStateSchema = z.object({
  status: OnboardingStatusSchema,
  step: OnboardingStepSchema,
  readyCount: z.number().int().nonnegative(),
  recommendedAssetCount: z.literal(3),
  assets: z.array(OnboardingAssetSchema),
  profile: OnboardingProfileSchema.nullable(),
});

export const UpdateOnboardingAssetInputSchema = z.object({
  representativeness: OnboardingRepresentativenessSchema,
});

export const UpdateOnboardingProfileInputSchema = OnboardingProfileSchema;

export type OnboardingAsset = z.infer<typeof OnboardingAssetSchema>;
export type OnboardingAssetInsight = z.infer<
  typeof OnboardingAssetInsightSchema
>;
export type OnboardingProfile = z.infer<typeof OnboardingProfileSchema>;
export type OnboardingRepresentativeness = z.infer<
  typeof OnboardingRepresentativenessSchema
>;
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;
export type UpdateOnboardingAssetInput = z.infer<
  typeof UpdateOnboardingAssetInputSchema
>;
export type UpdateOnboardingProfileInput = z.infer<
  typeof UpdateOnboardingProfileInputSchema
>;
