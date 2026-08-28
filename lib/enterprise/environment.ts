export type DeploymentEnv = "local" | "staging" | "production";

export function getDeploymentEnv(): DeploymentEnv {
  const explicit = String(process.env.ENTERPRISE_DEPLOYMENT_ENV || "").trim().toLowerCase();
  if (explicit === "local" || explicit === "staging" || explicit === "production") return explicit;
  const vercel = String(process.env.VERCEL_ENV || "").trim().toLowerCase();
  if (vercel === "production") return "production";
  if (vercel === "preview") return "staging";
  return "local";
}

export function previewPointsAtListedProductionProject(enterpriseUrl: string): boolean {
  if (getDeploymentEnv() !== "staging") return false;
  if (process.env.ENTERPRISE_ALLOW_PRODUCTION_DATA === "true") return false;
  return /dpiksashuqetyzrjogal/.test(enterpriseUrl);
}
