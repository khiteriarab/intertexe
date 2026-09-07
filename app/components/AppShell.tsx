import { headers } from "next/headers";
import { isPlatformHost } from "@/lib/dashboard/constants";
import { ClientApp } from "./ClientApp";

/** Server shell — platform.intertexe.com is a private surface with no consumer chrome. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get("host");
  const platformHost = isPlatformHost(host);

  return <ClientApp platformHost={platformHost}>{children}</ClientApp>;
}
