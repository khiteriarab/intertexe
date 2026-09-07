/**
 * Host-scoped session cookies for dashboard auth.
 *
 * IMPORTANT: Never set `domain` on these cookies. Each host maintains its own
 * session jar so consumer/HQ (www) and enterprise (platform.intertexe.com) stay
 * isolated. Login from platform.intertexe.com sets cookies on that host only.
 */
export type HostScopedCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

export function hostScopedSessionCookieOptions(maxAge = 60 * 60 * 12): HostScopedCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function clearHostScopedSessionCookieOptions(): HostScopedCookieOptions {
  return hostScopedSessionCookieOptions(0);
}
