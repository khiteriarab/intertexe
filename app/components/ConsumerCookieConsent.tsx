import { CookieConsent } from "./CookieConsent";

/** Cookie banner — path/host gating is client-side so the root layout stays static. */
export function ConsumerCookieConsent() {
  return <CookieConsent />;
}
