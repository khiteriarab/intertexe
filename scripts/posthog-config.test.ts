import assert from "node:assert/strict";
import { test } from "node:test";

test("posthog env helpers default host to US cloud", async () => {
  const prevKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const prevHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  const prevReplay = process.env.NEXT_PUBLIC_POSTHOG_REPLAY;
  try {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    delete process.env.NEXT_PUBLIC_POSTHOG_REPLAY;
    // Re-import fresh module state is awkward with ESM cache; call via dynamic import of source patterns.
    const { getPostHogHost, getPostHogKey, isPostHogConfigured, isPostHogReplayEnabled } =
      await import("../lib/posthog");
    assert.equal(getPostHogHost(), "https://us.i.posthog.com");
    assert.equal(getPostHogKey(), null);
    assert.equal(isPostHogConfigured(), false);
    assert.equal(isPostHogReplayEnabled(), true);
  } finally {
    if (prevKey === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    else process.env.NEXT_PUBLIC_POSTHOG_KEY = prevKey;
    if (prevHost === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    else process.env.NEXT_PUBLIC_POSTHOG_HOST = prevHost;
    if (prevReplay === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_REPLAY;
    else process.env.NEXT_PUBLIC_POSTHOG_REPLAY = prevReplay;
  }
});

test("posthog key from env enables configuration", async () => {
  const prevKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  try {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    // Module may already be cached with prior env — helpers read process.env live.
    const { getPostHogKey, isPostHogConfigured } = await import("../lib/posthog");
    assert.equal(getPostHogKey(), "phc_test_key");
    assert.equal(isPostHogConfigured(), true);
  } finally {
    if (prevKey === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    else process.env.NEXT_PUBLIC_POSTHOG_KEY = prevKey;
  }
});
