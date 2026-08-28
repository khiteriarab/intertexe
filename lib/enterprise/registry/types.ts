export type RegistryEnvironment = "sandbox" | "production";

export type RegistryRegistrationStatus =
  | "not_registered"
  | "registration_ready"
  | "submitted"
  | "registered"
  | "failed"
  | "update_required";

export type RegistryRegistrationRecord = {
  id: string;
  passport_id: string;
  passport_version_id: string;
  environment: RegistryEnvironment;
  api_version: string | null;
  status: RegistryRegistrationStatus;
  product_unique_identifier: string | null;
  economic_operator_identifier: string | null;
  commodity_code: string | null;
  submission_payload: Record<string, unknown> | null;
  submission_payload_hash: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  registry_response: Record<string, unknown> | null;
  eu_registration_identifier: string | null;
  verified_at: string | null;
  verified_by: string | null;
  error_state: Record<string, unknown> | null;
  retry_count: number;
};

export type RegistrationReadyPayload = {
  schema_version: string;
  registry_environment: RegistryEnvironment;
  product_unique_identifier: string;
  economic_operator_identifier: string | null;
  commodity_code: string | null;
  public_resolver_id: string;
  public_resolver_url: string;
  passport_version: number;
  integrity_hash: string | null;
  identifier_bundle: Record<string, unknown>;
  submission_note: string;
};

export interface DppRegistryProvider {
  readonly environment: RegistryEnvironment;
  readonly apiVersion: string;
  readonly automatedSubmissionAvailable: boolean;
  buildRegistrationPayload(input: RegistrationReadyPayload): Record<string, unknown>;
  validateEuRegistrationIdentifier(id: string): { valid: boolean; reason?: string };
}

export const REGISTRY_ENV_URLS: Record<RegistryEnvironment, string> = {
  sandbox: "https://registry.acc.product-passport.ec.europa.eu",
  production: "https://registry.product-passport.ec.europa.eu",
};
