/**
 * Loops contact sync + transactional send.
 *
 * Architecture:
 * - INTERTEXE automated mail (lifecycle, weekly edit, price drops) → Resend / mail.intertexe.com
 * - Khiteri personal founder welcome → Loops / khiteri@intertexe.com (template From in Loops UI)
 *
 * Do not add Resend fallbacks for founder welcome — dual-send is forbidden.
 */

type LoopsContactInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  userGroup?: string;
  invitationCode?: string;
};

export type LoopsTransactionalSendInput = {
  transactionalId: string;
  email: string;
  dataVariables?: Record<string, string | number>;
  /** When true, creates the contact if missing. */
  addToAudience?: boolean;
  /** Dedupes Loops sends for 24h. Prefer email_deliveries.id. */
  idempotencyKey?: string;
};

export type LoopsTransactionalSendResult =
  | { ok: true; providerMessageId: string | null; raw: Record<string, unknown> }
  | { ok: false; error: string; status?: number; raw?: Record<string, unknown> };

function resolveUserGroup(invitationCode?: string): string {
  const code = (invitationCode || "").toUpperCase();
  if (code.startsWith("FOUNDERS")) return "founders";
  if (code.startsWith("SILK") || code.startsWith("LINEN")) return "influencer";
  return "general";
}

export function getLoopsApiKey(): string | null {
  const key = process.env.LOOPS_API_KEY?.trim();
  return key || null;
}

/** Published Loops transactional ID for Founder Welcome. Required to send. */
export function getFounderWelcomeTransactionalId(): string | null {
  const id = process.env.LOOPS_FOUNDER_WELCOME_TRANSACTIONAL_ID?.trim();
  return id || null;
}

/**
 * Explicit production enable flag. When unset/false, founder welcome will not send
 * (and will not fall back to Resend). Set to "1" only after Loops template + domain
 * are verified and an internal test has passed.
 */
export function isLoopsFounderWelcomeEnabled(): boolean {
  return String(process.env.LOOPS_FOUNDER_WELCOME_ENABLED || "").trim() === "1";
}

async function loopsFetch(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {}
): Promise<Response> {
  const apiKey = getLoopsApiKey();
  if (!apiKey) throw new Error("LOOPS_API_KEY missing");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...((init.headers as Record<string, string>) || {}),
  };
  if (init.idempotencyKey) {
    headers["Idempotency-Key"] = init.idempotencyKey.slice(0, 100);
  }

  return fetch(`https://app.loops.so/api/v1${path}`, {
    ...init,
    headers,
  });
}

/** Validate API key against Loops. */
export async function verifyLoopsApiKey(): Promise<{
  ok: boolean;
  teamName?: string;
  error?: string;
}> {
  if (!getLoopsApiKey()) return { ok: false, error: "LOOPS_API_KEY missing" };
  try {
    const res = await loopsFetch("/api-key");
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        error: String(json.message || json.error || `HTTP ${res.status}`),
      };
    }
    return {
      ok: true,
      teamName: typeof json.teamName === "string" ? json.teamName : undefined,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "verify_failed" };
  }
}

/**
 * Sync a new signup to Loops (no-op when LOOPS_API_KEY is unset).
 *
 * NOTE: Loops may contain dashboard-managed automations (drip sequences, campaigns)
 * that are NOT visible in this repository. Do not create a Loops loop that also
 * sends Founder Welcome on contact create — that would duplicate the transactional API send.
 */
export async function syncContactToLoops(input: LoopsContactInput): Promise<void> {
  const apiKey = getLoopsApiKey();
  if (!apiKey) return;

  const userGroup = input.userGroup || resolveUserGroup(input.invitationCode);

  const res = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      email: input.email,
      firstName: input.firstName || undefined,
      lastName: input.lastName || undefined,
      source: input.source || "signup",
      userGroup,
      mailingLists: {
        weekly_edit: true,
      },
    }),
  });

  if (!res.ok) {
    // Contact may already exist — try update so attributes stay fresh.
    if (res.status === 409 || res.status === 400) {
      await updateLoopsContact({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        source: input.source || "signup",
        userGroup,
      }).catch(() => null);
      return;
    }
    const text = await res.text();
    console.error("Loops contact sync failed:", res.status, text);
  }
}

async function updateLoopsContact(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  userGroup?: string;
}): Promise<void> {
  const apiKey = getLoopsApiKey();
  if (!apiKey) return;

  const res = await fetch("https://app.loops.so/api/v1/contacts/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      email: input.email,
      firstName: input.firstName || undefined,
      lastName: input.lastName || undefined,
      source: input.source || undefined,
      userGroup: input.userGroup || undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Loops contact update failed:", res.status, text);
  }
}

/** Mark a contact unsubscribed in Loops (no-op when LOOPS_API_KEY is unset). */
export async function unsubscribeContactFromLoops(email: string): Promise<void> {
  const apiKey = getLoopsApiKey();
  if (!apiKey) return;

  const res = await fetch("https://app.loops.so/api/v1/contacts/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      email,
      unsubscribed: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Loops unsubscribe failed:", res.status, text);
  }
}

/**
 * Send a published Loops transactional email.
 * Response typically `{ success: true }` — Loops often does not return a message id.
 */
export async function sendLoopsTransactionalEmail(
  input: LoopsTransactionalSendInput
): Promise<LoopsTransactionalSendResult> {
  if (!getLoopsApiKey()) {
    return { ok: false, error: "LOOPS_API_KEY missing" };
  }

  try {
    const res = await loopsFetch("/transactional", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: JSON.stringify({
        email: input.email,
        transactionalId: input.transactionalId,
        addToAudience: input.addToAudience !== false,
        dataVariables: input.dataVariables || {},
      }),
    });

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (res.status === 409) {
      // Idempotency key already used — treat as success for our ledger reclaim path.
      return {
        ok: true,
        providerMessageId:
          typeof raw.id === "string"
            ? raw.id
            : input.idempotencyKey
              ? `loops-idempotent:${input.idempotencyKey}`
              : null,
        raw,
      };
    }

    if (!res.ok || raw.success === false) {
      return {
        ok: false,
        status: res.status,
        error: String(raw.message || raw.error || `HTTP ${res.status}`),
        raw,
      };
    }

    const providerMessageId =
      typeof raw.id === "string"
        ? raw.id
        : typeof raw.messageId === "string"
          ? raw.messageId
          : input.idempotencyKey
            ? `loops:${input.transactionalId}:${input.idempotencyKey}`
            : `loops:${input.transactionalId}`;

    return { ok: true, providerMessageId, raw };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "loops_send_failed",
    };
  }
}
