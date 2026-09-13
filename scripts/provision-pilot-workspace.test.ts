import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("Pilot workspace auto-provisioning", () => {
  const leads = fs.readFileSync(path.join(process.cwd(), "app/api/v1/leads/route.ts"), "utf8");
  const provision = fs.readFileSync(
    path.join(process.cwd(), "lib/enterprise/provision-pilot-workspace.ts"),
    "utf8"
  );

  it("wires snapshot leads to automated pilot provisioning", () => {
    assert.match(leads, /provisionPilotWorkspaceFromLead/);
    assert.match(leads, /intent === "snapshot"/);
    assert.match(leads, /workspaceUrl/);
  });

  it("creates demo pilot orgs with 10-product limits", () => {
    assert.match(provision, /plan: "demo"/);
    assert.match(provision, /PILOT_PRODUCT_LIMIT/);
    assert.match(provision, /pilot_started_at/);
    assert.match(provision, /provisionBrandOperator/);
  });
});
