/**
 * Safari Web Extension packaging helpers.
 * Listing URL is only available after App Store approval of the containing iOS app.
 */

export const SAFARI_EXTENSION_PACKAGE_DIR = "safari-web-extension/save-to-intertexe";

/** Placeholder until the App Store listing for the Safari extension (or host app) is live. */
export function getSafariExtensionInstallUrl(): string | null {
  const fromEnv = (process.env.NEXT_PUBLIC_SAFARI_EXTENSION_URL || "").trim();
  if (/^https?:\/\//i.test(fromEnv)) return fromEnv;
  return null;
}
