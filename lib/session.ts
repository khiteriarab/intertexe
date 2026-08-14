export const SESSION_STORAGE_KEY = "intertexe_session_id";
export const SESSION_COOKIE = "intertexe_session_id";
export const AUTH_TOKEN_KEY = "intertexe_auth_token";

function persistSessionCookie(sessionId: string) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`;
  } catch {
    // ignore
  }
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = "";
  try {
    sessionId = localStorage.getItem(SESSION_STORAGE_KEY) || "";
  } catch {
    sessionId = "";
  }
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } catch {
      // ignore
    }
  }
  persistSessionCookie(sessionId);
  return sessionId;
}

export function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}
