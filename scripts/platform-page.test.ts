import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "path";

describe("Platform material-intelligence page", () => {
  const home = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformHome.tsx"), "utf8");
  const chrome = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformChrome.tsx"), "utf8");
  const nav = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformNav.tsx"), "utf8");
  const comparison = fs.readFileSync(path.join(process.cwd(), "app/platform/ComparisonView.tsx"), "utf8");
  const login = fs.readFileSync(path.join(process.cwd(), "app/platform/login/page.tsx"), "utf8");
  const page = fs.readFileSync(path.join(process.cwd(), "app/platform/page.tsx"), "utf8");
  const form = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformLeadForm.tsx"), "utf8");

  it("positions INTERTEXE as material intelligence, not a DPP generator", () => {
    assert.match(home, /Turn messy product and material data into usable material intelligence/);
    assert.match(home, /Understand → Compare → Act/);
    assert.match(home, /PRODUCT DATA → MATERIAL INTELLIGENCE → BUSINESS INSIGHTS → DIGITAL PRODUCT PASSPORT/);
    assert.match(home, /Founding Pilot/);
    assert.match(home, /\$5,000/);
    assert.match(home, /From \$499\/month/);
    assert.match(home, /Free 10-Product Material Snapshot/);
    assert.match(home, /€0/);
    assert.doesNotMatch(home, /Digital Product Passports, from product data to publication/);
    assert.doesNotMatch(home, /The Digital Product Passport platform built for fashion/);
    assert.doesNotMatch(home, /Founding DPP Pilot/);
    assert.doesNotMatch(home, /material-data layer/);
    assert.doesNotMatch(home, /connect it to the infrastructure you choose later/i);
    assert.doesNotMatch(home, /DPP infrastructure you choose/i);
    assert.doesNotMatch(home, /Try the API demo/);
    assert.doesNotMatch(home, /\$1,250/);
    assert.doesNotMatch(home, /\$2,500/);
  });

  it("makes the 10-product snapshot the primary conversion path", () => {
    assert.match(home, /See INTERTEXE with your own products/);
    assert.match(home, /href="\/platform\/request\?intent=snapshot&cta=hero"/);
    assert.match(home, /href="\/platform\/demo"/);
    assert.match(home, /See the live demo/);
    assert.match(form, /Free 10-product Material Snapshot/);
    assert.match(form, /Founding Pilot \(\$5,000\)/);
  });

  it("keeps the live demo and a dashboard login path", () => {
    assert.match(home, /href="\/platform\/demo"/);
    assert.match(chrome, /href="\/dashboard\/login"/);
    assert.match(nav, /"\/dashboard\/login"/);
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
    assert.match(comparison, /TrusTrace/);
    assert.match(comparison, /EON/);
    assert.match(home, /19 August 2026/);
    assert.doesNotMatch(home, /can't do DPPs/i);
    assert.match(
      home,
      /Material Intelligence \+ Competitive Benchmarking \+ Data Quality \+ Supplier Data \+ Regulatory Intelligence \+ DPP creation\/hosting/
    );
    assert.match(home, /Coming \/ developing/);
    assert.match(home, /Illustrative example/);
    assert.match(home, /INTERTEXE consumer signal/i);
  });

  it("keeps the FAQ foldable", () => {
    assert.match(home, /<details key=\{item\.q\} name="platform-faq"/);
    assert.match(home, /Does INTERTEXE generate the Digital Product Passport/);
    assert.match(home, /Is INTERTEXE a Digital Product Passport company/);
  });

  it("recomposes the page for small screens without dropping the desktop spread", () => {
    assert.match(nav, /\{open \? "Close" : "Menu"\}/);
    assert.match(nav, /Snapshot/);
    assert.match(home, /WorkspaceGallery/);
    assert.match(home, /ComparisonView/);
    assert.match(home, /Understand → Compare → Act/);
    assert.match(comparison, /Compare INTERTEXE with/);
    assert.match(comparison, /hidden lg:block/);
  });
});
