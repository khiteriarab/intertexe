import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "path";

describe("Platform DPP operating-system page", () => {
  const home = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformHome.tsx"), "utf8");
  const chrome = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformChrome.tsx"), "utf8");
  const login = fs.readFileSync(path.join(process.cwd(), "app/platform/login/page.tsx"), "utf8");
  const page = fs.readFileSync(path.join(process.cwd(), "app/platform/page.tsx"), "utf8");

  it("positions INTERTEXE as a fashion DPP platform, not a data-cleaning layer", () => {
    assert.match(home, /Digital Product Passports, from product data to publication/);
    assert.match(home, /Founding DPP Pilot/);
    assert.match(home, /\$5,000/);
    assert.doesNotMatch(home, /material-data layer/);
    assert.doesNotMatch(home, /connect it to the infrastructure you choose later/i);
    assert.doesNotMatch(home, /DPP infrastructure you choose/i);
    assert.doesNotMatch(home, /Try the API demo/);
  });

  it("keeps the live demo and a dashboard login path", () => {
    assert.match(home, /href="\/platform\/demo"/);
    assert.match(home, /See the live demo/);
    assert.match(chrome, /href="\/dashboard\/login"/);
    assert.match(home, /Go to dashboard login/);
    assert.match(login, /redirect\("\/dashboard\/login"\)/);
    assert.match(page, /PlatformHome/);
  });

  it("does not overclaim certification or invent missing data", () => {
    assert.match(home, /does not fabricate product data/i);
    assert.match(home, /Do consumers need the INTERTEXE app/);
    assert.match(home, /The INTERTEXE scanner is not required/);
    assert.doesNotMatch(home, /EU Certified/);
    assert.doesNotMatch(home, /Guaranteed Compliant/);
    assert.doesNotMatch(home, /Official DPP Score/);
  });

  it("compares emphasis without unverified competitor gaps", () => {
    assert.match(home, /Built differently for fashion/);
    assert.match(home, /Not publicly confirmed/);
    assert.match(home, /TrusTrace/);
    assert.match(home, /EON/);
    assert.match(home, /19 August 2026/);
    assert.doesNotMatch(home, /can't do DPPs/i);
    assert.match(home, /Material Intelligence → DPP operations → Market \/ consumer intelligence/);
    assert.match(home, /Coming \/ developing/);
    assert.match(home, /Illustrative example/);
  });

  it("keeps the FAQ foldable", () => {
    assert.match(home, /<details key=\{item\.q\} name="platform-faq"/);
    assert.match(home, /Does INTERTEXE generate the Digital Product Passport/);
  });
});
