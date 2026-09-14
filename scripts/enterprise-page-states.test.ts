import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { ENTERPRISE_NAV } from "../lib/enterprise/constants.ts";
import {
  enterpriseModuleCatalog,
  enterpriseModuleCatalogByGroup,
} from "../lib/enterprise/marketing-modules.ts";
import { lifecycleModuleCatalogByGroup } from "../lib/enterprise/lifecycle-modules.ts";
import { ORG_PAGE_STATES, pageStateForNavHref } from "../lib/enterprise/page-states.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Enterprise page states and marketing sync", () => {
  it("promotes regulations and workflows to production maturity", () => {
    assert.equal(ORG_PAGE_STATES.regulations, "implemented");
    assert.equal(ORG_PAGE_STATES.workflows, "implemented");
  });

  it("marketing catalog mirrors enterprise nav labels", () => {
    const navLabels = ENTERPRISE_NAV.map((item) => item.label);
    const catalogLabels = enterpriseModuleCatalog().map((item) => item.label);
    assert.deepEqual(catalogLabels, navLabels);
  });

  it("every nav href has a page route and page state", () => {
    for (const item of ENTERPRISE_NAV) {
      const suffix = item.href || "/page.tsx";
      const routePath =
        item.href === ""
          ? path.join(ROOT, "app/dashboard/(org)/[organization]/page.tsx")
          : path.join(ROOT, `app/dashboard/(org)/[organization]${item.href}/page.tsx`);
      assert.ok(fs.existsSync(routePath), `missing route for ${item.label}: ${routePath}`);
      const state = pageStateForNavHref(item.href);
      assert.ok(["implemented", "partial", "placeholder"].includes(state));
    }
  });

  it("platform marketing grid uses lifecycle outcomes catalog", () => {
    const explorer = fs.readFileSync(
      path.join(ROOT, "app/platform/b2b-visuals/PlatformWorkspaceExplorer.tsx"),
      "utf8",
    );
    assert.match(explorer, /lifecycleModuleCatalogByGroup/);
    assert.doesNotMatch(explorer, /enterpriseModuleCatalogByGroup/);
    assert.doesNotMatch(explorer, /marketingMaturityFootnote/);
    const groups = lifecycleModuleCatalogByGroup();
    assert.equal(groups.length, 4);
    assert.deepEqual(groups.map((g) => g.label), ["Create", "Prove", "Understand", "Extend"]);
    assert.ok(groups.some((g) => g.modules.some((m) => m.label === "Material Benchmark")));
    assert.ok(groups.some((g) => g.modules.some((m) => m.label === "Digital Product Passport")));
    assert.ok(!groups.some((g) => g.modules.some((m) => m.label === "Billing")));
  });

  it("overview module showcase uses maturity badges", () => {
    const widgets = fs.readFileSync(path.join(ROOT, "app/dashboard/components/EntDashboardWidgets.tsx"), "utf8");
    assert.match(widgets, /enterpriseModuleCatalog/);
    assert.match(widgets, /StateBadge/);
    assert.match(widgets, /implementationSummary/);
  });
});
