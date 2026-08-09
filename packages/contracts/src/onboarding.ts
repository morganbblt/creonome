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

/**
 * Bible screen #17 calibration step: three response options a creator can
 * give to a short generated mini-concept during onboarding. These are
 * persisted as memory candidate signal (see
 * apps/api/src/modules/onboarding/onboarding-mapping.ts's
 * calibrationResponseConfidence/calibrationResponseContent) rather than
 * driving generation directly, the same way explicit opportunity feedback
 * (always_do/never_use) becomes memory candidate signal today.
 */
export const OnboardingCalibrationResponseValueSchema = z.enum([
  "feels_like_me",
  "future_direction",
  "not_for_me",
]);

export const OnboardingCalibrationConceptSchema = z.object({
  id: z.string().trim().min(1).max(60),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(12).max(320),
});

/** Always exactly six mini-concepts, per bible screen #17. */
export const OnboardingCalibrationSetSchema = z.object({
  concepts: z.array(OnboardingCalibrationConceptSchema).length(6),
});

export const OnboardingCalibrationResponseInputSchema =
  OnboardingCalibrationConceptSchema.extend({
    conceptId: z.string().trim().min(1).max(60),
    response: OnboardingCalibrationResponseValueSchema,
  }).omit({ id: true });

export const SubmitOnboardingCalibrationResponsesInputSchema = z.object({
  responses: z.array(OnboardingCalibrationResponseInputSchema).min(1).max(6),
});

export const SubmitOnboardingCalibrationResponsesResultSchema = z.object({
  saved: z.number().int().nonnegative(),
});

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
export type OnboardingCalibrationResponseValue = z.infer<
  typeof OnboardingCalibrationResponseValueSchema
>;
export type OnboardingCalibrationConcept = z.infer<
  typeof OnboardingCalibrationConceptSchema
>;
export type OnboardingCalibrationSet = z.infer<
  typeof OnboardingCalibrationSetSchema
>;
export type OnboardingCalibrationResponseInput = z.infer<
  typeof OnboardingCalibrationResponseInputSchema
>;
export type SubmitOnboardingCalibrationResponsesInput = z.infer<
  typeof SubmitOnboardingCalibrationResponsesInputSchema
>;
export type SubmitOnboardingCalibrationResponsesResult = z.infer<
  typeof SubmitOnboardingCalibrationResponsesResultSchema
>;
