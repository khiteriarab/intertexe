export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function sessionIdFromAccessToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  const sessionId = payload?.session_id;
  return typeof sessionId === "string" && sessionId ? sessionId : null;
}

export function authUserIdFromAccessToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  const sub = payload?.sub;
  return typeof sub === "string" && sub ? sub : null;
}
