import { ClientApp } from "./ClientApp";

/**
 * Root chrome wrapper. Keep this a plain server component with no request
 * APIs — reading the host here dynamizes every route (including /platform)
 * and streams the shop catalog skeleton as the first paint. Host detection
 * lives in ClientApp from the URL / pathname.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return <ClientApp>{children}</ClientApp>;
}
