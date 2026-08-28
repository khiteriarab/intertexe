import {
  type DppRegistryProvider,
  type RegistrationReadyPayload,
  type RegistryEnvironment,
} from "./types";

/** Manual workflow adapter — no fabricated API calls or browser automation. */
export class ManualRegistryProvider implements DppRegistryProvider {
  readonly environment: RegistryEnvironment;
  readonly apiVersion = "manual-v1";
  readonly automatedSubmissionAvailable = false;

  constructor(environment: RegistryEnvironment) {
    this.environment = environment;
  }

  buildRegistrationPayload(input: RegistrationReadyPayload): Record<string, unknown> {
    return {
      schema_version: input.schema_version,
      registry_environment: this.environment,
      api_version: this.apiVersion,
      product_unique_identifier: input.product_unique_identifier,
      economic_operator_identifier: input.economic_operator_identifier,
      commodity_code: input.commodity_code,
      public_resolver_id: input.public_resolver_id,
      public_resolver_url: input.public_resolver_url,
      passport_version: input.passport_version,
      integrity_hash: input.integrity_hash,
      identifier_bundle: input.identifier_bundle,
      submission_note: input.submission_note,
      disclaimer:
        "INTERTEXE registration-ready payload. EU Registry registration identifier is separate from public resolver ID.",
    };
  }

  validateEuRegistrationIdentifier(id: string): { valid: boolean; reason?: string } {
    const trimmed = id.trim();
    if (!trimmed) return { valid: false, reason: "Empty registration identifier." };
    if (trimmed.length < 8 || trimmed.length > 256) {
      return { valid: false, reason: "Registration identifier length out of expected bounds." };
    }
    if (!/^[A-Za-z0-9._:/-]+$/.test(trimmed)) {
      return { valid: false, reason: "Registration identifier contains unexpected characters." };
    }
    return { valid: true };
  }
}

export function getRegistryProvider(environment: RegistryEnvironment): DppRegistryProvider {
  return new ManualRegistryProvider(environment);
}
