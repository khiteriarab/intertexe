import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "path";
import { captureWatchId, parseCaptureWatchId, savedPriceText } from "../lib/sale-alerts.ts";

describe("Sale alerts", () => {
  it("keys capture watches so they cannot collide with catalog product ids", () => {
    assert.equal(captureWatchId("abc"), "capture:abc");
    assert.equal(parseCaptureWatchId("capture:abc"), "abc");
    assert.equal(parseCaptureWatchId("rakuten-123"), null);
  });

  it("requires a numeric price to watch a piece", () => {
    assert.equal(savedPriceText(null), null);
    assert.equal(savedPriceText(0), null);
    assert.equal(savedPriceText(128, "EUR"), "128 EUR");
  });

  it("routes extension and matches page through the same account API", () => {
    const api = fs.readFileSync(path.join(process.cwd(), "app/api/sale-alerts/route.ts"), "utf8");
    const matches = fs.readFileSync(path.join(process.cwd(), "app/matches/[id]/MatchesClient.tsx"), "utf8");
    const popup = fs.readFileSync(path.join(process.cwd(), "chrome-web-store/save-to-intertexe/popup.js"), "utf8");
    const drops = fs.readFileSync(path.join(process.cwd(), "app/api/notifications/price-drops/route.ts"), "utf8");
    assert.match(api, /price_watches/);
    assert.match(matches, /Waiting for a sale\?/);
    assert.match(matches, /\/api\/sale-alerts/);
    assert.match(popup, /SALE_ALERT/);
    assert.match(drops, /loadCaptureSaleWatchFavorites/);
  });
});
