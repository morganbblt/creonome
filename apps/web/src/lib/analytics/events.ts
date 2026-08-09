/**
 * The six activation events the product bible defines for the onboarding →
 * first-value funnel. Names are stable strings (not enum members) because
 * they are sent as-is to PostHog, where they become permanent event
 * definitions -- renaming a TypeScript symbol must never rename the event
 * creators' historical data is keyed on.
 */
export const AnalyticsEvent = {
  /** Creator opened the onboarding workspace and began adding sources. */
  OnboardingStarted: "onboarding_started",
  /** Creator reached the "3 sources gives a sharper profile" threshold. */
  OnboardingAssetsImported: "onboarding_assets_imported",
  /** Creator confirmed their Creator DNA on the post-profile review step. */
  CreatorDnaConfirmed: "creator_dna_confirmed",
  /** A new opportunity batch finished generating on Today. */
  OpportunityBatchGenerated: "opportunity_batch_generated",
  /** Creator saved an opportunity card for later from Today. */
  OpportunitySaved: "opportunity_saved",
  /** An opportunity was upgraded from idea to a generated script. */
  OpportunityUpgradedToScript: "opportunity_upgraded_to_script",
} as const;

export type AnalyticsEvent =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export type AnalyticsProperties = Record<string, string | number | boolean | null>;
