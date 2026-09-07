import { headers } from "next/headers";
import { isPlatformHost } from "@/lib/dashboard/constants";
import { CookieConsent } from "./CookieConsent";

export async function ConsumerCookieConsent() {
  const host = (await headers()).get("host");
  if (isPlatformHost(host)) return null;
  return <CookieConsent />;
}
