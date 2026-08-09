import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnalyticsClient } from "./analytics-client";
import { AnalyticsEvent } from "./events";

describe("createAnalyticsClient", () => {
  it("is a true no-op when no API key is configured", () => {
    const posthog = { init: vi.fn(), capture: vi.fn() };
    const client = createAnalyticsClient({
      apiKey: undefined,
      apiHost: undefined,
      posthog,
    });

    expect(() =>
      client.track(AnalyticsEvent.OnboardingStarted, { foo: "bar" }),
    ).not.toThrow();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("stays a no-op for an empty-string API key", () => {
    const posthog = { init: vi.fn(), capture: vi.fn() };
    const client = createAnalyticsClient({
      apiKey: "",
      apiHost: undefined,
      posthog,
    });

    client.track(AnalyticsEvent.OpportunitySaved);

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("initializes PostHog lazily, once, and forwards captured events when a key is present", () => {
    const posthog = { init: vi.fn(), capture: vi.fn() };
    const client = createAnalyticsClient({
      apiKey: "phc_test_key",
      apiHost: "https://eu.i.posthog.com",
      posthog,
    });
    expect(posthog.init).not.toHaveBeenCalled();

    client.track(AnalyticsEvent.OnboardingStarted, { entryStep: "source" });
    client.track(AnalyticsEvent.OpportunitySaved, { opportunityId: "abc" });

    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({
        api_host: "https://eu.i.posthog.com",
        capture_pageview: false,
        autocapture: false,
        person_profiles: "identified_only",
      }),
    );
    expect(posthog.capture).toHaveBeenCalledTimes(2);
    expect(posthog.capture).toHaveBeenNthCalledWith(
      1,
      "onboarding_started",
      { entryStep: "source" },
    );
    expect(posthog.capture).toHaveBeenNthCalledWith(2, "opportunity_saved", {
      opportunityId: "abc",
    });
  });

  it("falls back to the default PostHog Cloud host when none is configured", () => {
    const posthog = { init: vi.fn(), capture: vi.fn() };
    const client = createAnalyticsClient({
      apiKey: "phc_test_key",
      apiHost: undefined,
      posthog,
    });

    client.track(AnalyticsEvent.CreatorDnaConfirmed);

    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({ api_host: "https://us.i.posthog.com" }),
    );
  });
});

describe("getAnalyticsClient / track", () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const originalHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  afterEach(async () => {
    vi.resetModules();
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    else process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    if (originalHost === undefined)
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    else process.env.NEXT_PUBLIC_POSTHOG_HOST = originalHost;
  });

  it("never throws and never reaches the real posthog-js client when unconfigured", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    vi.resetModules();
    vi.doMock("posthog-js", () => ({
      default: {
        init: vi.fn(() => {
          throw new Error("must not be called without a key");
        }),
        capture: vi.fn(() => {
          throw new Error("must not be called without a key");
        }),
      },
    }));

    const { track } = await import("./analytics");
    const { AnalyticsEvent: Events } = await import("./events");

    expect(() =>
      track(Events.OnboardingStarted, { entryStep: "source" }),
    ).not.toThrow();

    vi.doUnmock("posthog-js");
  });

  it("swallows errors thrown by the underlying client instead of surfacing them", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    vi.resetModules();
    vi.doMock("posthog-js", () => ({
      default: {
        init: vi.fn(() => {
          throw new Error("network unavailable");
        }),
        capture: vi.fn(),
      },
    }));

    const { track } = await import("./analytics");
    const { AnalyticsEvent: Events } = await import("./events");

    expect(() => track(Events.OpportunitySaved)).not.toThrow();

    vi.doUnmock("posthog-js");
  });
});
