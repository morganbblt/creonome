import posthogJs from "posthog-js";
import type { PostHog } from "posthog-js";
import type { AnalyticsEvent, AnalyticsProperties } from "./events";

export interface AnalyticsClient {
  track(event: AnalyticsEvent, properties?: AnalyticsProperties): void;
}

/** The subset of the posthog-js client this wrapper actually calls. */
type PostHogLike = Pick<PostHog, "init" | "capture">;

const DEFAULT_API_HOST = "https://us.i.posthog.com";

/**
 * Fail-gracefully-without-config pattern, same spirit as
 * UnavailableMemoryProvider / UnavailableStructuredGenerator on the API
 * side (see apps/api/src/modules/memory/unavailable-memory.provider.ts and
 * apps/api/src/modules/ai/unavailable-structured.generator.ts) -- except
 * analytics is best-effort telemetry, not a capability the rest of the app
 * depends on, so this never throws. It is a true no-op: every call site can
 * fire tracking events unconditionally in every environment (local dev,
 * tests, a deployment with no PostHog project configured yet) without
 * guarding on whether analytics is set up.
 */
class NoopAnalyticsClient implements AnalyticsClient {
  track(): void {
    // Intentional no-op: analytics is not configured for this deployment.
  }
}

class PostHogAnalyticsClient implements AnalyticsClient {
  private initialized = false;

  constructor(
    private readonly posthog: PostHogLike,
    private readonly apiKey: string,
    private readonly apiHost: string,
  ) {}

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.posthog.init(this.apiKey, {
      api_host: this.apiHost,
      // This wrapper only ever calls posthog.capture() for the six
      // explicit activation events -- it does not want PostHog's implicit
      // pageview/autocapture instrumentation double-counting alongside
      // deliberately named events.
      capture_pageview: false,
      autocapture: false,
      person_profiles: "identified_only",
    });
  }

  track(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
    this.ensureInitialized();
    this.posthog.capture(event, properties ?? undefined);
  }
}

/**
 * Builds a client for the given configuration. Exported separately from
 * getAnalyticsClient() so tests can construct a real PostHogAnalyticsClient
 * wired to a mock `posthog` object, without touching the module-level
 * singleton or ever reaching a real PostHog endpoint.
 */
export function createAnalyticsClient(options: {
  apiKey: string | undefined;
  apiHost: string | undefined;
  posthog?: PostHogLike;
}): AnalyticsClient {
  if (!options.apiKey) return new NoopAnalyticsClient();
  return new PostHogAnalyticsClient(
    options.posthog ?? posthogJs,
    options.apiKey,
    options.apiHost || DEFAULT_API_HOST,
  );
}

let cachedClient: AnalyticsClient | null = null;

/**
 * The client the app actually uses. Reads NEXT_PUBLIC_POSTHOG_KEY as a
 * literal `process.env.NEXT_PUBLIC_...` expression (rather than through
 * @creonome/config) because that is what lets Next.js inline it into the
 * client bundle at build time -- see apps/web/proxy.ts's
 * NEXT_PUBLIC_DISABLE_AUTH for the same pattern elsewhere in this app.
 * Server-side rendering never has a `window`, so it always resolves to the
 * no-op client there regardless of configuration.
 */
export function getAnalyticsClient(): AnalyticsClient {
  if (typeof window === "undefined") return new NoopAnalyticsClient();
  cachedClient ??= createAnalyticsClient({
    apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });
  return cachedClient;
}
