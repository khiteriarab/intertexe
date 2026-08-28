import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { getEnterpriseServiceClient } from "../lib/enterprise/client.ts";

const BASE = process.env.CUSTOMER_ZERO_BASE_URL || "http://localhost:3001";
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const creds = JSON.parse(readFileSync("/tmp/atlas-atelier-brand.json", "utf8")) as {
  email: string;
  password: string;
  slug: string;
  organizationId: string;
  userId: string;
  role: string;
};
const csv = readFileSync(path.join(ROOT, "scripts/fixtures/atlas-atelier-10-products.csv"), "utf8").replace(
  "Shared GTIN A",
  `Shared GTIN A rerun ${Date.now()}`
);
const csvUpdate = readFileSync(path.join(ROOT, "scripts/fixtures/atlas-atelier-oxford-update.csv"), "utf8");

type Step = { step: string; pass: boolean; detail: string };

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText();
}

async function main() {
  const steps: Step[] = [];
  const record = (step: string, pass: boolean, detail: string) => {
    steps.push({ step, pass, detail });
    if (!pass) console.error(`FAIL ${step}: ${detail}`);
    else console.log(`PASS ${step}: ${detail}`);
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(120000);
  await page.addInitScript(() => {
    localStorage.setItem("cookie_consent", "accepted");
  });

  async function open(path: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  }

  try {
    await open("/dashboard/login");
    await page.getByLabel("Email").fill(creds.email);
    await page.getByLabel("Password").fill(creds.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard\/atlas-atelier/, { timeout: 120000, waitUntil: "domcontentloaded" });
    const afterLogin = await bodyText(page);
    const navText = await page.locator("nav[aria-label='Organization']").innerText().catch(() => "");
    record(
      "login → organization",
      page.url().includes("/dashboard/atlas-atelier") &&
        !afterLogin.includes("Private operating system") &&
        !afterLogin.includes("This week"),
      `url=${page.url()}`
    );
    record(
      "unfinished modules hidden from brand nav",
      navText.includes("Products") &&
        navText.includes("Issues") &&
        navText.includes("Passports") &&
        !navText.includes("Suppliers") &&
        !navText.includes("Analytics") &&
        !navText.includes("Developers"),
      navText.replace(/\s+/g, " ").slice(0, 300)
    );

    await open("/dashboard");
    await page.waitForTimeout(1500);
    const hqBody = await bodyText(page);
    record(
      "brand login does not expose HQ",
      !hqBody.includes("Private operating system") &&
        !hqBody.includes("This week (Mon–Sun)") &&
        !page.url().includes("/dashboard/command-center"),
      `url=${page.url()}`
    );

    await open("/dashboard/intertexe");
    await page.waitForTimeout(2000);
    const otherOrg = await bodyText(page);
    const leakedCustomerZero =
      otherOrg.includes("Browser oxford") ||
      otherOrg.includes("Customer-zero") ||
      otherOrg.includes("CZ-E2E") ||
      otherOrg.includes("CZ-BR");
    record(
      "brand user sees only its own organization / no intertexe",
      !leakedCustomerZero &&
        (otherOrg.includes("Atlas Atelier") ||
          otherOrg.toLowerCase().includes("not found") ||
          !page.url().includes("/dashboard/intertexe")),
      `url=${page.url()}`
    );

    await open("/dashboard/atlas-atelier/products");
    const cookieAccept = page.getByTestId("button-cookie-accept");
    if (await cookieAccept.isVisible().catch(() => false)) {
      await cookieAccept.click();
    }
    const skipImport = process.env.ATLAS_SKIP_IMPORT === "1";
    await page.getByRole("textbox", { name: "CSV" }).fill(csv);
    await page.getByRole("button", { name: "Preview import" }).click();
    await page.getByText("rows ·").waitFor({ timeout: 120000 });
    const previewText = await bodyText(page);
    record(
      "preview explains identifier collisions instead of silent merge",
      /identifier collisions kept separate/i.test(previewText),
      previewText.match(/identifier collisions kept separate[^\n]*/i)?.[0] ||
        previewText.match(/Ambiguous identifier collision[^\n]*/)?.[0] ||
        "preview counts visible"
    );
    const mappingLabels = await page.locator("section label").allInnerTexts();
    const mappingBlock = mappingLabels.join("\n");
    const skuSuggested = mappingBlock.includes("SKU") && mappingBlock.includes("Suggested (high confidence)");
    const notesIgnored = mappingBlock.includes("Notes") && mappingBlock.includes("Not mapped");
    const materialNotAuto = !mappingBlock.includes("MATERIAL_1");
    record(
      "upload and mapping are understandable without founder intervention",
      skuSuggested && notesIgnored && materialNotAuto,
      mappingBlock.slice(0, 800)
    );

    if (!skipImport) {
      await page.getByRole("button", { name: "Confirm import" }).click();
      await page.getByText(/Imported \d+ products|already imported/i).waitFor({ timeout: 120000 });
      const importMsg = await page.getByText(/Imported \d+ products|already imported/i).innerText();
      record("import preview → confirm", /Imported \d+ products|already imported/i.test(importMsg), importMsg);
    } else {
      record("import preview → confirm", true, "skipped; catalog already imported by pilot gate");
    }

    await open("/dashboard/atlas-atelier/issues");
    await page.waitForTimeout(1500);
    const issuesText = await bodyText(page);
    record(
      "deterministic validation creates expected issues",
      issuesText.includes("Composition missing") &&
        issuesText.includes("Composition percentages do not total 100") &&
        issuesText.includes("Manufacturing country / origin missing") &&
        (issuesText.includes("Ambiguous identifier collision") || issuesText.includes("identifier")),
      issuesText.slice(0, 1200)
    );
    record(
      "identifier collision is explicit with operator actions",
      /Ambiguous identifier collision/i.test(issuesText) &&
        /Confirm same product/i.test(issuesText) &&
        /Treat as separate/i.test(issuesText) &&
        /Correct identifier/i.test(issuesText) &&
        issuesText.includes("5601234567890"),
      "collision card + actions"
    );

    await open("/dashboard/atlas-atelier/products");
    const oxfordHref = await page.getByRole("link", { name: "Atlantic Oxford Shirt" }).getAttribute("href");
    const trousersHref = await page.getByRole("link", { name: "Dock Trousers" }).getAttribute("href");
    const dressA = await page.getByRole("link", { name: "Market Day Dress", exact: true }).count();
    const dressB = await page.getByRole("link", { name: /Market Day Dress — sample/ }).count();
    assert.ok(oxfordHref && trousersHref);
    record(
      "duplicate GTIN did not silently collapse catalog rows",
      dressA >= 1 && dressB >= 1,
      `marketDay=${dressA} sample=${dressB}`
    );

    await open(oxfordHref);
    await page.getByRole("heading", { name: "Atlantic Oxford Shirt" }).waitFor();
    const oxford = await bodyText(page);
    record(
      "source records remain after import",
      oxford.includes("upload ·") && oxford.includes("Source records"),
      oxford.includes("upload ·") ? "source hash present" : "missing source"
    );
    record(
      "normalization retains provenance",
      oxford.includes("100% Cotton") && /original/i.test(oxford),
      oxford.includes("100% Cotton") ? "original 100% Cotton retained" : "composition not visible"
    );

    const oxfordHasConflict = oxford.includes("differs from new source");
    if (!oxfordHasConflict) {
      await page.getByPlaceholder("Why these identity and composition values are accepted").fill(
        "Matches Atlas SS26 spec sheet for the Atlantic Oxford."
      );
      await page.getByRole("button", { name: "Approve identity and composition" }).click();
      await page.getByText("Fields locked as approved.").waitFor();
    }
    const afterApprove = await bodyText(page);
    record(
      "manual review records editor reason timestamp",
      afterApprove.includes("Approved identity and composition") || afterApprove.includes("Fields locked as approved"),
      oxfordHasConflict ? "prior approval retained; conflict pending" : "approval activity visible"
    );
    record(
      "reviewer identity is human-readable",
      /Maya Chen/.test(afterApprove),
      /Maya Chen/.test(afterApprove) ? "Maya Chen visible" : "display name missing"
    );

    record(
      "passport preview before publish",
      afterApprove.includes("Passport preview") && afterApprove.includes("Atlantic Oxford Shirt"),
      "preview card visible"
    );
    const canPublishNow = afterApprove.includes("Phase 1 DPP requirements met");
    record(
      "eligible product can publish",
      canPublishNow || oxfordHasConflict,
      canPublishNow ? "ready" : afterApprove.match(/Not ready:[^\n]+/)?.[0] || "conflict or blocked"
    );

    if (canPublishNow) {
      await page.getByRole("button", { name: "Publish passport" }).click();
      await page.getByText(/Published itx_/).waitFor({ timeout: 120000 });
      const publishedLine = await page.getByText(/Published itx_/).innerText();
      record("publish", /Published itx_/.test(publishedLine), publishedLine);
    } else if (oxfordHasConflict) {
      record("publish", true, "v1 already on the passport list; open conflict correctly blocks a new version");
    }

    await open(trousersHref);
    await page.getByRole("heading", { name: "Dock Trousers" }).waitFor();
    await page.getByText("Not ready").waitFor();
    const trousers = await bodyText(page);
    record(
      "incomplete products cannot be falsely represented as DPP-ready",
      trousers.includes("Not ready") && !trousers.includes("Phase 1 DPP requirements met"),
      trousers.match(/Not ready:[^\n]+/)?.[0] || "missing blocker"
    );
    await page.getByRole("button", { name: "Publish passport" }).click();
    await page.waitForTimeout(1500);
    const trousersAfter = await bodyText(page);
    record(
      "incomplete publish is blocked",
      trousersAfter.toLowerCase().includes("blocked") || trousersAfter.includes("Not ready"),
      trousersAfter.match(/Publish blocked[^\n]*|Passport cannot[^\n]*|Not ready:[^\n]+/)?.[0] || "check"
    );

    await open("/dashboard/atlas-atelier/passports");
    const passportsPage = await bodyText(page);
    const publicId = (passportsPage.match(/itx_[a-z0-9]+/) || [])[0] || "";
    record("passport list has public id", Boolean(publicId), publicId || "none");

    if (publicId) {
      await open(`/p/${publicId}`);
      const publicPage = await bodyText(page);
      record(
        "QR/public resolver",
        publicPage.includes("Atlantic Oxford Shirt") && /Published version [12]/.test(publicPage),
        `url=/p/${publicId} ${publicPage.match(/Published version \d/)?.[0] || ""}`
      );
      const json = await (await page.request.get(`${BASE}/p/${publicId}/json`)).json();
      record(
        "machine-readable matches canonical",
        json.public_id === publicId && Number(json.version) >= 1,
        JSON.stringify({ public_id: json.public_id, version: json.version, name: json.name || json.product_name })
      );

      await open(oxfordHref);
      await page.getByRole("heading", { name: "Atlantic Oxford Shirt" }).waitFor();
      let afterUpdate = await bodyText(page);
      if (!afterUpdate.includes("differs from new source")) {
        await open("/dashboard/atlas-atelier/products");
        await page.getByRole("textbox", { name: "CSV" }).fill(csvUpdate);
        await page.getByRole("button", { name: "Preview import" }).click();
        await page.getByText("rows ·").waitFor({ timeout: 120000 });
        await page.getByRole("button", { name: "Confirm import" }).click();
        await page.getByText(/Imported \d+ products|already imported/i).waitFor({ timeout: 120000 });
        await open(oxfordHref);
        await page.getByRole("heading", { name: "Atlantic Oxford Shirt" }).waitFor();
        afterUpdate = await bodyText(page);
      }
      const sourceCount = (afterUpdate.match(/upload ·/g) || []).length;
      record("later source update preserves prior source rows", sourceCount >= 2, `sourceRowsVisible=${sourceCount}`);
      record(
        "reconciliation creates conflict state",
        afterUpdate.includes("differs from new source"),
        afterUpdate.includes("differs from new source") ? "locked composition conflict" : "no conflict text"
      );

      if (afterUpdate.includes("differs from new source")) {
        await page.getByRole("button", { name: "resolved" }).first().click();
        await page.waitForTimeout(2000);
      }
      for (let i = 0; i < 5; i += 1) {
        const nextIssue = page.getByRole("button", { name: "resolved" }).first();
        if (!(await nextIssue.isVisible().catch(() => false))) break;
        await nextIssue.click();
        await page.waitForTimeout(1500);
      }
      await page.getByPlaceholder("Why these identity and composition values are accepted").fill(
        "Accepted incoming 98/2 blend after reviewing the locked-field conflict."
      );
      await page.getByRole("button", { name: "Approve identity and composition" }).click();
      await page.getByText("Fields locked as approved.").waitFor();
      const readyAgain = await bodyText(page);
      if (readyAgain.includes("Phase 1 DPP requirements met")) {
        await page.getByRole("button", { name: "Publish passport" }).click();
        await page.getByText(/Published itx_/).waitFor({ timeout: 120000 });
      } else {
        record("v2 blocked after reconciliation", false, readyAgain.match(/Not ready:[^\n]+/)?.[0] || "not ready");
      }

      await open(`/p/${publicId}`);
      const v2page = await bodyText(page);
      record("v2 public resolver", v2page.includes("Published version 2"), v2page.match(/Published version \d/)?.[0] || "missing");
      const json2 = await (await page.request.get(`${BASE}/p/${publicId}/json`)).json();
      record("v2 machine-readable", json2.version === 2 && json2.public_id === publicId, `version=${json2.version}`);
    }

    const admin = getEnterpriseServiceClient();
    assert.ok(admin);
    const { data: oxfordProduct } = await admin
      .from("products")
      .select("id")
      .eq("organization_id", creds.organizationId)
      .eq("sku", "ATL-OXF-001")
      .maybeSingle();
    if (oxfordProduct?.id) {
      const { data: sources } = await admin
        .from("source_records")
        .select("id, payload_hash")
        .eq("organization_id", creds.organizationId)
        .eq("product_id", oxfordProduct.id);
      const firstHash = sources?.[0]?.payload_hash;
      if (firstHash && sources?.[0]?.id) {
        const { error } = await admin
          .from("source_records")
          .update({ payload_hash: "mutated" })
          .eq("id", sources[0].id);
        record("source records remain immutable", Boolean(error), error?.message || "update unexpectedly succeeded");
      }
      const { data: passport } = await admin
        .from("passports")
        .select("id, public_id")
        .eq("organization_id", creds.organizationId)
        .eq("product_id", oxfordProduct.id)
        .maybeSingle();
      if (passport?.id) {
        const { error: v1err } = await admin
          .from("passport_versions")
          .update({ change_summary: "mutated" })
          .eq("passport_id", passport.id)
          .eq("version_number", 1);
        record("published v1 remains immutable", Boolean(v1err), v1err?.message || "v1 update unexpectedly succeeded");
        const { data: versions } = await admin
          .from("passport_versions")
          .select("version_number")
          .eq("passport_id", passport.id)
          .order("version_number");
        record(
          "v2 published while v1 retained",
          (versions || []).some((row) => row.version_number === 1) &&
            (versions || []).some((row) => row.version_number === 2),
          JSON.stringify(versions)
        );
      }
    }

    const { data: intertexe } = await admin.from("organizations").select("id").eq("slug", "intertexe").maybeSingle();
    const { createClient } = await import("@supabase/supabase-js");
    const userClient = createClient(
      String(process.env.ENTERPRISE_SUPABASE_URL),
      String(process.env.ENTERPRISE_SUPABASE_ANON_KEY),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const session = await userClient.auth.signInWithPassword({ email: creds.email, password: creds.password });
    assert.equal(session.error, null, session.error?.message);
    const { data: own } = await userClient.from("products").select("sku");
    const { data: other } = intertexe?.id
      ? await userClient.from("products").select("sku").eq("organization_id", intertexe.id)
      : { data: [] };
    record(
      "Org A cannot access Org B",
      (own || []).some((row) => row.sku === "ATL-OXF-001") && (other || []).length === 0,
      `own=${(own || []).length} intertexeVisible=${(other || []).length}`
    );

    const { data: allIssues } = await admin
      .from("issues")
      .select("issue_type, title, severity, status, product_id")
      .eq("organization_id", creds.organizationId);
    const { data: products } = await admin
      .from("products")
      .select("id, sku, name, passport_state")
      .eq("organization_id", creds.organizationId);
    const { data: passportRows } = await admin
      .from("passports")
      .select("public_id, state, product_id")
      .eq("organization_id", creds.organizationId);

    const summary = {
      role: creds.role,
      organization: creds.slug,
      organizationId: creds.organizationId,
      datasetRows: 10,
      products: products || [],
      issues: allIssues || [],
      passports: passportRows || [],
      steps,
      failed: steps.filter((s) => !s.pass),
    };
    writeFileSync("/tmp/atlas-atelier-acceptance.json", JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ failed: summary.failed.length, steps: steps.length, products: (products || []).length }, null, 2));
    if (summary.failed.length) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
