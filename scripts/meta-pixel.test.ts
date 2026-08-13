/**
 * Meta Pixel helpers (no live network).
 * Run: npm run test:meta-pixel
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getMetaPixelId,
  newMetaEventId,
  metaTrackViewContent,
  flushMetaPixelQueue,
  META_PIXEL_CONSENT_KEY,
} from "../lib/meta-pixel.ts";

test("getMetaPixelId reads NEXT_PUBLIC_META_PIXEL_ID", () => {
  const prev = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "1853785949331787";
  assert.equal(getMetaPixelId(), "1853785949331787");
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "  ";
  assert.equal(getMetaPixelId(), null);
  if (prev === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  else process.env.NEXT_PUBLIC_META_PIXEL_ID = prev;
});

test("newMetaEventId is stable-prefix unique", () => {
  const a = newMetaEventId("pv");
  const b = newMetaEventId("pv");
  assert.match(a, /^pv_/);
  assert.notEqual(a, b);
  assert.ok(a.length <= 100);
});

test("metaTrackViewContent queues until pixel ready then flushes", () => {
  const prev = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "1853785949331787";

  const calls: unknown[][] = [];
  (globalThis as { window?: unknown }).window = {
    __intertexeMetaPixelInitialized: false,
    localStorage: {
      store: { [META_PIXEL_CONSENT_KEY]: "accepted" } as Record<string, string>,
      getItem(k: string) {
        return this.store[k] ?? null;
      },
      setItem(k: string, v: string) {
        this.store[k] = v;
      },
    },
    fbq(...args: unknown[]) {
      calls.push(args);
    },
    dispatchEvent() {
      return true;
    },
  };

  metaTrackViewContent({ contentIds: ["p1"], contentName: "Dress" });
  assert.equal(calls.length, 0, "should queue before ready");

  (globalThis as { window: { __intertexeMetaPixelInitialized: boolean } }).window.__intertexeMetaPixelInitialized =
    true;
  flushMetaPixelQueue();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "track");
  assert.equal(calls[0][1], "ViewContent");

  if (prev === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  else process.env.NEXT_PUBLIC_META_PIXEL_ID = prev;
  delete (globalThis as { window?: unknown }).window;
});
