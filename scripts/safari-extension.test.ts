import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const safariDir = path.join(root, "safari-web-extension", "save-to-intertexe");

describe("Safari Web Extension package", () => {
  it("ships a Safari MV3 manifest with large icons", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(safariDir, "manifest.json"), "utf8"));
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.name, "INTERTEXE: Fabric Scanner");
    assert.equal(manifest.version, "1.0.4");
    assert.equal(manifest.browser_specific_settings?.safari?.strict_min_version, "16.4");
    assert.ok(manifest.icons["512"]);
    assert.ok(manifest.icons["1024"]);
    assert.ok(fs.existsSync(path.join(safariDir, manifest.icons["512"])));
    assert.ok(fs.existsSync(path.join(safariDir, manifest.icons["1024"])));
  });

  it("attributes captures as safari_extension, not chrome_extension", () => {
    const bg = fs.readFileSync(path.join(safariDir, "background.js"), "utf8");
    const popup = fs.readFileSync(path.join(safariDir, "popup.js"), "utf8");
    assert.match(bg, /sourceApp:\s*"safari_extension"/);
    assert.doesNotMatch(bg, /"chrome_extension"/);
    assert.doesNotMatch(popup, /"chrome_extension"/);
    assert.match(popup, /"safari_extension"/);
  });

  it("documents the Mac converter handoff", () => {
    const setup = fs.readFileSync(path.join(root, "safari-web-extension", "APPLE-SETUP.md"), "utf8");
    assert.match(setup, /safari-web-extension-converter/);
    assert.match(setup, /Browse Extensions/);
  });
});
