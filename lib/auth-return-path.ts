import { safeInternalPath } from "./public-match-set";

const AUTH_ROOTS = new Set([
  "/account",
  "/signup",
  "/login",
  "/signin",
  "/auth",
  "/reset-password",
]);

function firstQueryValue(raw: string | string[] | undefined): string | null {
  if (Array.isArray(raw)) return raw[0] || null;
  return raw || null;
}

function splitPathAndQuery(value: string): { path: string; query: string } {
  const hash = value.indexOf("#");
  const withoutHash = hash >= 0 ? value.slice(0, hash) : value;
  const q = withoutHash.indexOf("?");
  if (q < 0) return { path: withoutHash, query: "" };
  return { path: withoutHash.slice(0, q), query: withoutHash.slice(q + 1) };
}

/**
 * Path a signed-in shopper can be sent to. Drops dead routes that 404
 * (`/matches` with no id, `/login`, `/favorites`) and maps legacy capture
 * URLs onto `/matches/{id}`.
 */
export function safeLoginReturnPath(raw: string | null | undefined): string | null {
  const value = safeInternalPath(raw);
  if (!value) return null;

  const { path: rawPath, query } = splitPathAndQuery(value);
  const path = rawPath.replace(/\/+$/, "") || "/";
  const segments = path.split("/").filter(Boolean);

  if (path === "/") return null;
  if (AUTH_ROOTS.has(`/${segments[0] || ""}`) || path.startsWith("/auth/")) return null;
  if (path.startsWith("/dashboard") || path.startsWith("/platform") || path.startsWith("/api")) {
    return null;
  }
  if (path === "/favorites" || path === "/wishlist") return "/account";

  if (segments[0] === "inspirations" || segments[0] === "capture") {
    if (segments.length < 2) return null;
    const suffix = query ? `?${query}` : "";
    return `/matches/${segments[1]}${suffix}`;
  }

  if (segments[0] === "matches" && segments.length < 2) return null;

  const suffix = query ? `?${query}` : "";
  return `${path}${suffix}`;
}

export function accountAuthHref(
  mode: "login" | "signup",
  currentPath?: string | null
): string {
  const params = new URLSearchParams();
  params.set("mode", mode);
  const next = safeLoginReturnPath(currentPath);
  if (next) params.set("next", next);
  return `/account?${params.toString()}`;
}

export function accountRedirectFromSearch(
  search: Record<string, string | string[] | undefined>,
  mode: "login" | "signup" = "login"
): string {
  return accountAuthHref(mode, firstQueryValue(search.next));
}
