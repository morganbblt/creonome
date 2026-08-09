import { getAnalyticsClient } from "./analytics-client";
import type { AnalyticsEvent, AnalyticsProperties } from "./events";

export { AnalyticsEvent } from "./events";
export type { AnalyticsProperties } from "./events";

/**
 * Fire-and-forget product analytics for the six onboarding → first-value
 * activation events the product bible defines. Never throws: a missing
 * NEXT_PUBLIC_POSTHOG_KEY, an ad-blocker, or a PostHog outage must never
 * break the creator's flow, so failures here are swallowed rather than
 * surfaced. See apps/web/src/lib/analytics/analytics-client.ts for the
 * no-op-without-config wrapper this delegates to.
 */
export function track(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
): void {
  try {
    getAnalyticsClient().track(event, properties);
  } catch {
    // Analytics must never break the product experience.
  }
}
