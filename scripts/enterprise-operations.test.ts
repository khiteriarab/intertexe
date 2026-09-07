/**
 * Enterprise operational infrastructure tests.
 * Run: npm run test:enterprise-operations
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { toPublicSsoDiscovery } from "../lib/enterprise/sso-config.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Enterprise operational infrastructure", () => {
  it("migration 020 defines operational tables", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/020_enterprise_operations.sql"),
      "utf8"
    );
    for (const table of [
      "enterprise_notifications",
      "approval_requests",
      "approval_request_events",
      "import_row_errors",
      "integration_connections",
      "integration_runs",
      "saved_views",
      "organization_security_settings",
      "scim_connections",
    ]) {
      assert.match(sql, new RegExp(table));
    }
  });

  it("workflow event bus module exists", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/workflow-events.ts"), "utf8");
    assert.match(src, /emitWorkflowEvent/);
    assert.match(src, /activity_events/);
    assert.match(src, /audit_logs/);
  });

  it("notifications module supports in-app and email", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/notifications.ts"), "utf8");
    assert.match(src, /enterprise_notifications/);
    assert.match(src, /notification_preferences/);
    assert.match(src, /sendCustomerEmail/);
  });

  it("approval engine has request and decide flows", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/approvals.ts"), "utf8");
    assert.match(src, /createApprovalRequest/);
    assert.match(src, /decideApprovalRequest/);
    assert.match(src, /approval_request_events/);
  });

  it("bulk operations cover issues and products", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/bulk-ops.ts"), "utf8");
    assert.match(src, /bulkResolveIssues/);
    assert.match(src, /bulkApproveProductFields/);
    assert.match(src, /bulkArchiveProducts/);
  });

  it("import ops center exposes history and detail loaders", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/import-ops.ts"), "utf8");
    assert.match(src, /loadImportHistory/);
    assert.match(src, /loadImportDetail/);
    assert.match(src, /import_row_errors/);
  });

  it("audit query loader exists for admin viewer", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/audit-query.ts"), "utf8");
    assert.match(src, /loadAuditLogs/);
  });

  it("SSO SAML complete flow uses client session endpoint", () => {
    const session = fs.readFileSync(path.join(ROOT, "app/api/auth/sso/session/route.ts"), "utf8");
    const complete = fs.readFileSync(path.join(ROOT, "app/auth/sso/complete/SsoCompleteInner.tsx"), "utf8");
    assert.match(session, /authorizeEnterpriseSsoSessionFromToken/);
    assert.match(complete, /access_token/);
    assert.match(complete, /\/api\/auth\/sso\/session/);
  });

  it("API routes exist for tier 1 and 2 surfaces", () => {
    for (const route of [
      "app/api/dashboard/org/[organization]/notifications/route.ts",
      "app/api/dashboard/org/[organization]/approvals/route.ts",
      "app/api/dashboard/org/[organization]/bulk/route.ts",
      "app/api/dashboard/org/[organization]/imports/route.ts",
      "app/api/dashboard/org/[organization]/audit/route.ts",
      "app/api/dashboard/org/[organization]/integrations/health/route.ts",
      "app/api/dashboard/org/[organization]/developers/credentials/route.ts",
      "app/api/dashboard/org/[organization]/exports/route.ts",
      "app/api/dashboard/org/[organization]/search/route.ts",
      "app/api/dashboard/org/[organization]/saved-views/route.ts",
      "app/api/dashboard/org/[organization]/admin/route.ts",
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, route)), route);
    }
  });

  it("org nav includes operational modules", () => {
    const constants = fs.readFileSync(path.join(ROOT, "lib/enterprise/constants.ts"), "utf8");
    assert.match(constants, /Import center/);
    assert.match(constants, /Audit log/);
    assert.match(constants, /Approvals/);
    assert.match(constants, /Exports/);
  });

  it("discovery privacy unchanged", () => {
    const pub = toPublicSsoDiscovery({
      ssoAvailable: true,
      organizationId: "secret",
      organizationSlug: "secret",
      enforceSso: true,
      allowPasswordFallback: false,
      providerLabel: "Okta",
    });
    assert.deepEqual(pub, {
      ssoAvailable: true,
      ssoRequired: true,
      passwordAllowed: false,
      providerLabel: "Okta",
    });
  });
});
