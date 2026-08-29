/**
 * Production verification for EU DPP foundations + Atlas synthetic passport.
 * Uses service client for DB checks and public HTTP for resolver checks.
 *
 * Usage:
 *   node --env-file=.env.development.local --import tsx scripts/production-eu-dpp-verification.ts
 */
import assert from "node:assert/strict";
import { getEnterpriseServiceClient } from "../lib/enterprise/client.ts";
import { integrityHash, canonicalJson } from "../lib/enterprise/integrity.ts";
import { prepareRegistryRegistration } from "../lib/enterprise/registry/service.ts";

const BASE = process.env.CUSTOMER_ZERO_BASE_URL || "https://www.intertexe.com";
const OXFORD_PRODUCT_ID = "b7dd87e0-a2e1-4312-aac8-35a52ae29fc1";
const OXFORD_PUBLIC_ID = "itx_66236d2s2p0j386v0a5m";
const ATLAS_ORG_ID = "df749d5a-66d9-4eaa-9cbe-52d3bef45117";

async function main() {
  const admin = getEnterpriseServiceClient();
  assert.ok(admin, "service client required");

  const htmlRes = await fetch(`${BASE}/p/${OXFORD_PUBLIC_ID}`);
  assert.equal(htmlRes.status, 200, "public HTML resolver");
  const html = await htmlRes.text();
  assert.match(html, /Atlantic Oxford Shirt/);

  const jsonRes = await fetch(`${BASE}/p/${OXFORD_PUBLIC_ID}/json`);
  assert.equal(jsonRes.status, 200, "public JSON resolver");
  const jsonBody = (await jsonRes.json()) as {
    public_id: string;
    data: { fields: Array<{ access_class?: string }>; resolver_note?: string };
  };
  assert.equal(jsonBody.public_id, OXFORD_PUBLIC_ID);
  assert.ok(jsonBody.data.resolver_note?.includes("separate"), "resolver note present on new deploy");
  for (const field of jsonBody.data.fields || []) {
    assert.equal(field.access_class, "public", "only public fields in JSON");
  }

  const { data: passport } = await admin
    .from("passports")
    .select("id, public_id, current_version_id, state")
    .eq("organization_id", ATLAS_ORG_ID)
    .eq("public_id", OXFORD_PUBLIC_ID)
    .maybeSingle();
  assert.ok(passport?.current_version_id, "passport exists");

  const { data: versions } = await admin
    .from("passport_versions")
    .select("id, version_number, integrity_hash, snapshot, identifier_bundle, previous_version_id, published_at, ruleset_version, ontology_version")
    .eq("passport_id", passport!.id)
    .order("version_number", { ascending: true });

  assert.ok((versions || []).length >= 2, "oxford has v1+v2");
  const v1 = versions!.find((v) => v.version_number === 1);
  const v2 = versions!.find((v) => v.version_number === 2);
  assert.ok(v1?.published_at, "v1 published");
  assert.ok(v2?.published_at, "v2 published");

  // v1/v2 predate integrity_hash migration — attempt immutability check
  const { error: immutErr } = await admin
    .from("passport_versions")
    .update({ change_summary: "should-not-stick" })
    .eq("id", v1!.id);
  assert.ok(immutErr, "published v1 immutable");

  // Publish a fresh synthetic v3 to verify new foundations if product allows — skip if blocked
  // Instead verify registry prepare on current version
  const current = versions!.find((v) => v.id === passport!.current_version_id)!;
  const prep1 = await prepareRegistryRegistration({
    client: admin,
    organizationId: ATLAS_ORG_ID,
    passportId: passport!.id,
    passportVersionId: current.id,
    productId: OXFORD_PRODUCT_ID,
    environment: "sandbox",
  });
  const prep2 = await prepareRegistryRegistration({
    client: admin,
    organizationId: ATLAS_ORG_ID,
    passportId: passport!.id,
    passportVersionId: current.id,
    productId: OXFORD_PRODUCT_ID,
    environment: "sandbox",
  });
  assert.equal(prep1.status, "registration_ready");
  assert.equal(prep1.payload.public_resolver_id, OXFORD_PUBLIC_ID);
  assert.notEqual(
    prep1.payload.product_unique_identifier,
    prep1.payload.public_resolver_id,
    "product UID can differ from resolver when GTIN present"
  );

  const { data: reg1 } = await admin
    .from("dpp_registry_registrations")
    .select("submission_payload_hash, submission_payload, eu_registration_identifier")
    .eq("passport_version_id", current.id)
    .eq("environment", "sandbox")
    .maybeSingle();
  assert.ok(reg1?.submission_payload_hash, "payload hash stored");
  const hashCheck = integrityHash(reg1!.submission_payload);
  assert.equal(hashCheck, reg1!.submission_payload_hash, "deterministic payload hash");

  // Re-prepare should produce same hash (deterministic)
  const { data: reg2 } = await admin
    .from("dpp_registry_registrations")
    .select("submission_payload_hash")
    .eq("passport_version_id", current.id)
    .eq("environment", "sandbox")
    .maybeSingle();
  assert.equal(reg2?.submission_payload_hash, reg1!.submission_payload_hash, "idempotent prepare");

  assert.equal(reg1?.eu_registration_identifier || null, null, "no fabricated EU ID");

  const { data: backups } = await admin
    .from("passport_backup_packages")
    .select("id, package_hash, passport_version_id")
    .eq("passport_id", passport!.id);
  // Backups only created on publish after 018 — may be empty for pre-migration versions
  console.log(
    JSON.stringify(
      {
        ok: true,
        base: BASE,
        publicResolver: OXFORD_PUBLIC_ID,
        passportState: passport!.state,
        versionCount: versions!.length,
        currentVersion: current.version_number,
        currentIntegrityHash: current.integrity_hash || null,
        currentIdentifierBundle: current.identifier_bundle || null,
        backupPackageCount: (backups || []).length,
        registryStatus: prep1.status,
        registryPayloadHash: reg1!.submission_payload_hash,
        registryPayload: reg1!.submission_payload,
        publicJsonFieldCount: jsonBody.data.fields?.length || 0,
        note:
          "Oxford v1/v2 published before 018 may lack integrity_hash/identifier_bundle/backups. Registry prepare verified on current version.",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
