import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "path";
import { getChromeWebStoreUrl } from "../lib/chrome-extension.ts";

describe("Desktop install CTAs", () => {
  it("points Add to Chrome at the Chrome Web Store listing", () => {
    const url = getChromeWebStoreUrl();
    assert.match(url, /^https:\/\/chromewebstore\.google\.com\/detail\/intertexe-fabric-scanner\//);
    assert.match(url, /kiifidnbenolnpcapedgjjjjmedbllba/);
  });

  it("keeps the phone iOS prompt and adds desktop Chrome + iOS header CTAs", () => {
    const nav = fs.readFileSync(path.join(process.cwd(), "app/components/Navbar.tsx"), "utf8");
    const client = fs.readFileSync(path.join(process.cwd(), "app/components/ClientApp.tsx"), "utf8");
    const ctas = fs.readFileSync(path.join(process.cwd(), "app/components/InstallCtas.tsx"), "utf8");
    assert.match(nav, /InstallCtas/);
    assert.match(client, /AppDownloadPrompt/);
    assert.match(ctas, /Add to Chrome/);
    assert.match(ctas, /iOS App/);
    assert.match(ctas, /md:hidden/);
    assert.match(ctas, /hidden md:flex/);
    assert.doesNotMatch(ctas, /#0038A8|#1A2B88/);
  });
});
