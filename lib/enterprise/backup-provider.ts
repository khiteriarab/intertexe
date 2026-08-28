import type { SupabaseClient } from "@supabase/supabase-js";
import { integrityHash } from "./integrity";

export type BackupStatus = "local" | "pending_replication" | "replicated" | "failed";

export type BackupPackage = {
  package_hash: string;
  package_snapshot: Record<string, unknown>;
  evidence_manifest: Array<Record<string, unknown>>;
  backup_provider_ref: string;
  backup_status: BackupStatus;
};

export interface DppBackupProvider {
  readonly providerRef: string;
  buildPackage(input: {
    passportId: string;
    versionNumber: number;
    snapshot: Record<string, unknown>;
    identifierBundle: Record<string, unknown>;
    integrityHash: string;
    evidenceManifest: Array<Record<string, unknown>>;
  }): BackupPackage;
}

export class LocalBackupProvider implements DppBackupProvider {
  readonly providerRef = "intertexe.local-backup.v1";

  buildPackage(input: {
    passportId: string;
    versionNumber: number;
    snapshot: Record<string, unknown>;
    identifierBundle: Record<string, unknown>;
    integrityHash: string;
    evidenceManifest: Array<Record<string, unknown>>;
  }): BackupPackage {
    const package_snapshot = {
      passport_id: input.passportId,
      version_number: input.versionNumber,
      created_at: new Date().toISOString(),
      snapshot: input.snapshot,
      identifier_bundle: input.identifierBundle,
      integrity_hash: input.integrityHash,
      format: "intertexe.dpp-backup.v1",
      note: "Local immutable backup package. Not a certified DPP service-provider submission.",
    };
    return {
      package_hash: integrityHash(package_snapshot),
      package_snapshot,
      evidence_manifest: input.evidenceManifest,
      backup_provider_ref: this.providerRef,
      backup_status: "local",
    };
  }
}

export function getBackupProvider(): DppBackupProvider {
  return new LocalBackupProvider();
}

export async function createPassportBackupPackage(input: {
  client: SupabaseClient;
  organizationId: string;
  passportId: string;
  passportVersionId: string;
  versionNumber: number;
  snapshot: Record<string, unknown>;
  identifierBundle: Record<string, unknown>;
  integrityHashValue: string;
  evidenceManifest?: Array<Record<string, unknown>>;
}) {
  const provider = getBackupProvider();
  const pkg = provider.buildPackage({
    passportId: input.passportId,
    versionNumber: input.versionNumber,
    snapshot: input.snapshot,
    identifierBundle: input.identifierBundle,
    integrityHash: input.integrityHashValue,
    evidenceManifest: input.evidenceManifest || [],
  });

  await input.client.from("passport_backup_packages").insert({
    organization_id: input.organizationId,
    passport_id: input.passportId,
    passport_version_id: input.passportVersionId,
    package_hash: pkg.package_hash,
    package_snapshot: pkg.package_snapshot,
    evidence_manifest: pkg.evidence_manifest,
    backup_provider_ref: pkg.backup_provider_ref,
    backup_status: pkg.backup_status,
  });

  return pkg;
}
