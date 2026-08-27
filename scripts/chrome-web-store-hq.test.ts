import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "path";
import { CHROME_WEB_STORE_ITEM_ID, getChromeWebStoreUrl } from "../lib/chrome-extension.ts";
import {
  chromeWebStoreBundle,
  normalizeChromeWebStoreListingId,
  parseOptionalCount,
} from "../lib/dashboard/integrations/providers/chrome-web-store.ts";

describe("Chrome Web Store HQ integration", () => {
  it("registers chrome_web_store next to App Store Connect", () => {
    const registry = fs.readFileSync(
      path.join(process.cwd(), "lib/dashboard/integrations/registry.ts"),
      "utf8"
    );
    assert.match(registry, /id: "chrome_web_store"/);
    assert.match(registry, /cardId: "chrome_web_store"/);
    assert.match(registry, /chromeWebStoreAdapter/);
    assert.match(registry, /app_store_connect: appStoreConnectAdapter,\s*chrome_web_store: chromeWebStoreAdapter/);
  });

  it("accepts the live listing id and rejects website-click stand-ins", () => {
    assert.equal(normalizeChromeWebStoreListingId(CHROME_WEB_STORE_ITEM_ID), CHROME_WEB_STORE_ITEM_ID);
    assert.throws(() => normalizeChromeWebStoreListingId("not-an-id"));
    const bundle = chromeWebStoreBundle({ listingId: CHROME_WEB_STORE_ITEM_ID, weeklyInstalls: 12 });
    assert.equal(bundle.externalAccountId, CHROME_WEB_STORE_ITEM_ID);
    assert.equal(bundle.metadata?.listingId, CHROME_WEB_STORE_ITEM_ID);
    assert.equal(bundle.metadata?.weeklyInstalls, 12);
    assert.match(String(bundle.metadata?.listingUrl || ""), /kiifidnbenolnpcapedgjijjmedbllba/);
    assert.equal(parseOptionalCount(""), null);
    assert.equal(parseOptionalCount("0"), 0);
    assert.equal(parseOptionalCount("-1"), null);
  });

  it("keeps Settings chrome form separate from the App Store .p8 upload", () => {
    const client = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/(app)/settings/IntegrationsClient.tsx"),
      "utf8"
    );
    assert.match(client, /chrome_web_store/);
    assert.match(client, /\/api\/dashboard\/integrations\/chrome-web-store/);
    assert.match(client, /setShowChromeForm/);
    assert.match(client, /setShowAscForm/);
    assert.match(client, /Weekly installs/);
    assert.match(
      client,
      /providerId === "chrome_web_store"\s*\?\s*setShowChromeForm\(true\)/
    );
  });

  it("seeds Chrome extension as a Settings data source", () => {
    const settings = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/(app)/settings/page.tsx"),
      "utf8"
    );
    assert.match(settings, /chrome_extension/);
    assert.match(settings, /Chrome extension/);
    assert.match(settings, /chrome_web_store/);
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260827_hq_chrome_web_store.sql"),
      "utf8"
    );
    assert.match(sql, /chrome_web_store/);
    assert.match(sql, /hq_oauth_connections_provider_check/);
  });

  it("does not treat website Add to Chrome clicks as installs", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib/dashboard/revenue-command-center.ts"),
      "utf8"
    );
    assert.match(source, /Website clicks are not installs/);
    assert.match(source, /chrome_installs[\s\S]{0,500}availability: chrome\?\.connected/);
    const adapter = fs.readFileSync(
      path.join(process.cwd(), "lib/dashboard/integrations/providers/chrome-web-store.ts"),
      "utf8"
    );
    assert.match(adapter, /Website “Add to Chrome” clicks are never treated as installs/);
    assert.equal(getChromeWebStoreUrl().includes(CHROME_WEB_STORE_ITEM_ID), true);
  });
});
