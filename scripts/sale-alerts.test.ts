import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "path";
import { saleAlertContextFromBody, scoreSaleProduct } from "../lib/sale-alerts.ts";

describe("Sale alerts", () => {
  it("stores an account preference, not a watch on the retailer URL", () => {
    const ctx = saleAlertContextFromBody({
      source: "chrome_extension",
      captureId: "cap-1",
      brand: "Example",
      category: "dress",
      price: 120,
      currency: "EUR",
      materials: "silk",
    });
    assert.equal(ctx?.source, "chrome_extension");
    assert.equal(ctx?.brand, "Example");
    assert.equal(ctx?.captureId, "cap-1");
    const silk = scoreSaleProduct(
      { brand_name: "Example", category: "dress", composition: "100% silk", natural_fiber_percent: 100, price: 110 },
      ctx
    );
    const other = scoreSaleProduct(
      { brand_name: "Other", category: "jeans", composition: "cotton", natural_fiber_percent: 80, price: 400 },
      ctx
    );
    assert.ok(silk > other);
  });

  it("keeps the Chrome Alert me treatment and routes it to the account API", () => {
    const api = fs.readFileSync(path.join(process.cwd(), "app/api/sale-alerts/route.ts"), "utf8");
    const popup = fs.readFileSync(path.join(process.cwd(), "chrome-web-store/save-to-intertexe/popup.js"), "utf8");
    const drops = fs.readFileSync(path.join(process.cwd(), "app/api/notifications/price-drops/route.ts"), "utf8");
    assert.match(api, /sale_alerts_enabled/);
    assert.doesNotMatch(api, /price_watches/);
    assert.match(popup, /Waiting for a sale\?/);
    assert.match(popup, /Alert me/);
    assert.match(popup, /Sign in to turn on a sale alert\./);
    assert.match(popup, /SALE_ALERT/);
    assert.match(drops, /dispatchCatalogSaleAlerts/);
  });
});
