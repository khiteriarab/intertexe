import { cookies } from "next/headers";
import { cache } from "react";
import { ENTERPRISE_SESSION_COOKIE } from "./constants";
import { getEnterpriseAnonClient } from "./client";
import { getHandoffSession, handoffIsLive } from "./identity-links";
import { requireHandoffStillValid } from "./handoff";
import { sessionIdFromAccessToken } from "./jwt-claims";

export type EnterpriseAuthSession = {
  authUserId: string;
  email: string;
  fullName: string | null;
  accessToken: string;
  kind: "native" | "handoff";
  sessionId: string | null;
};

export async function readEnterpriseAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ENTERPRISE_SESSION_COOKIE)?.value?.trim() || null;
}

export const getEnterpriseAuthSession = cache(async (): Promise<EnterpriseAuthSession | null> => {
  const token = await readEnterpriseAccessToken();
  if (!token) return null;
  const auth = getEnterpriseAnonClient();
  if (!auth) return null;
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) return null;

  const sessionId = sessionIdFromAccessToken(token);
  const handoff = sessionId ? await getHandoffSession(sessionId) : null;
  if (handoff) {
    if (!handoffIsLive(handoff)) return null;
    const still = await requireHandoffStillValid({
      accessToken: token,
      sessionId,
      enterpriseUserId: data.user.id,
    });
    if (!still) return null;
    return {
      authUserId: data.user.id,
      email: data.user.email.trim().toLowerCase(),
      fullName: (data.user.user_metadata?.name as string) || null,
      accessToken: token,
      kind: "handoff",
      sessionId,
    };
  }

  return {
    authUserId: data.user.id,
    email: data.user.email.trim().toLowerCase(),
    fullName: (data.user.user_metadata?.name as string) || null,
    accessToken: token,
    kind: "native",
    sessionId,
  };
});
