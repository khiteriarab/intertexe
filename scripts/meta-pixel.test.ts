/**
 * Meta Pixel helpers (no live network).
 * Run: npm run test:meta-pixel
 */
import test from "node:test";
import assert from "node:assert/strict";
import { getMetaPixelId, newMetaEventId } from "../lib/meta-pixel.ts";

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
