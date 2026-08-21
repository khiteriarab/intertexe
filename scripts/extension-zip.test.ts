import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "path";
import { execFileSync } from "node:child_process";

describe("Fabric Scanner Chrome Web Store zip", () => {
  it("puts manifest.json at the zip root and matches the download filename", () => {
    const zipPath = path.join(process.cwd(), "public/downloads/INTERTEXE-Fabric-Scanner-1.0.20.zip");
    const route = fs.readFileSync(path.join(process.cwd(), "app/extension/download/route.ts"), "utf8");
    assert.match(route, /INTERTEXE-Fabric-Scanner-1.0.20\.zip/);
    const listing = execFileSync("python3", [
      "-c",
      `import zipfile; print("\\n".join(zipfile.ZipFile(${JSON.stringify(zipPath)}).namelist()))`,
    ], { encoding: "utf8" });
    const names = listing.trim().split("\n");
    assert.ok(names.includes("manifest.json"), listing);
    assert.ok(names.includes("popup.js"), listing);
    assert.ok(!names.some((name) => name.startsWith("save-to-intertexe/")), listing);
  });
});
