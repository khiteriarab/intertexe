import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../email-constants";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Match Gmail draft subjects (case/punctuation tolerant). */
export const DRAFT_TEMPLATES = {
  influencer: {
    contactType: "influencer" as const,
    subjectNeedle: "you might love what we built",
    label: "Influencers",
  },
  customer: {
    contactType: "customer" as const,
    subjectNeedle: "i think you'd love the intertexe clothing",
    label: "Potential customers",
  },
} as const;

export type DraftTemplateKey = keyof typeof DRAFT_TEMPLATES;

type GmailHeader = { name?: string; value?: string };
type GmailPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};
type GmailMessage = {
  id?: string;
  threadId?: string;
  payload?: {
    headers?: GmailHeader[];
    mimeType?: string;
    body?: { data?: string; size?: number };
    parts?: GmailPart[];
  };
};
type GmailDraft = { id?: string; message?: { id?: string } };

function header(headers: GmailHeader[] | undefined, name: string): string {
  const hit = (headers || []).find((h) => String(h.name || "").toLowerCase() === name.toLowerCase());
  return String(hit?.value || "");
}

function normalizeSubject(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function subjectMatchesTemplate(subject: string, needle: string): boolean {
  return normalizeSubject(subject).includes(normalizeSubject(needle));
}

/** Replace {firstname} / {first_name} / {{firstname}} placeholders. */
export function personalizeTemplate(text: string, firstName: string): string {
  const name = (firstName || "").trim() || "there";
  return text
    .replace(/\{\{\s*first_?name\s*\}\}/gi, name)
    .replace(/\{\s*first_?name\s*\}/gi, name)
    .replace(/\{\s*firstname\s*\}/gi, name);
}

export function resolveContactFirstName(c: {
  first_name?: string | null;
  full_name?: string | null;
  name?: string | null;
}): string {
  const first = String(c.first_name || "").trim();
  if (first) return first.split(/\s+/)[0];
  const full = String(c.full_name || c.name || "").trim();
  if (full) return full.split(/\s+/)[0];
  return "there";
}

function decodeB64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  const buf = Buffer.from(padded, "base64");
  return buf.toString("utf8");
}

function encodeB64Url(raw: string): string {
  return Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function walkParts(part: GmailPart | undefined, out: { text?: string; html?: string }) {
  if (!part) return;
  const mime = String(part.mimeType || "");
  const data = part.body?.data;
  if (data) {
    if (mime === "text/plain" && !out.text) out.text = decodeB64Url(data);
    if (mime === "text/html" && !out.html) out.html = decodeB64Url(data);
  }
  for (const child of part.parts || []) walkParts(child, out);
}

function extractBodies(msg: GmailMessage): { text?: string; html?: string } {
  const out: { text?: string; html?: string } = {};
  walkParts(msg.payload, out);
  return out;
}

function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildRawMime(input: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string | null;
}): string {
  const lines: string[] = [];
  if (input.from) lines.push(`From: ${input.from}`);
  lines.push(`To: ${input.to}`);
  lines.push(`Subject: ${encodeHeaderValue(input.subject)}`);
  lines.push("MIME-Version: 1.0");

  const html = input.html;
  const text = input.text;
  if (html && text) {
    const boundary = `itx_${Date.now().toString(36)}`;
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 8bit");
    lines.push("");
    lines.push(text);
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 8bit");
    lines.push("");
    lines.push(html);
    lines.push(`--${boundary}--`);
  } else if (html) {
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 8bit");
    lines.push("");
    lines.push(html);
  } else {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 8bit");
    lines.push("");
    lines.push(text || "");
  }
  return lines.join("\r\n");
}

async function gmailJson(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; json: Record<string, unknown>; status: number }> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    redirect: "manual",
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { error: text.slice(0, 200) };
  }
  return { ok: res.ok, json, status: res.status };
}

async function listDraftSummaries(accessToken: string): Promise<GmailDraft[]> {
  const { ok, json } = await gmailJson(accessToken, "/drafts?maxResults=100");
  if (!ok) {
    const msg =
      (json.error as { message?: string } | undefined)?.message ||
      String(json.error || "Gmail drafts list failed");
    throw new Error(msg);
  }
  return ((json.drafts as GmailDraft[]) || []).filter((d) => d.id && d.message?.id);
}

async function getMessageFull(accessToken: string, messageId: string): Promise<GmailMessage> {
  const { ok, json } = await gmailJson(
    accessToken,
    `/messages/${encodeURIComponent(messageId)}?format=full`
  );
  if (!ok) {
    throw new Error(
      String((json.error as { message?: string } | undefined)?.message || "Gmail message get failed")
    );
  }
  return json as GmailMessage;
}

async function createDraft(
  accessToken: string,
  raw: string
): Promise<{ draftId: string; messageId: string | null }> {
  const { ok, json } = await gmailJson(accessToken, "/drafts", {
    method: "POST",
    body: JSON.stringify({ message: { raw: encodeB64Url(raw) } }),
  });
  if (!ok) {
    throw new Error(
      String((json.error as { message?: string } | undefined)?.message || "Gmail draft create failed")
    );
  }
  return {
    draftId: String(json.id || ""),
    messageId: String((json.message as { id?: string } | undefined)?.id || "") || null,
  };
}

export type PrepareDraftsResult = {
  ok: boolean;
  created: number;
  byType: {
    influencer: { created: number; skipped: number; templateSubject: string | null };
    customer: { created: number; skipped: number; templateSubject: string | null };
  };
  samples: Array<{ type: string; email: string; firstName: string; subject: string }>;
  errors: string[];
  needsReconnect?: boolean;
  message?: string;
};

export function connectionHasComposeScope(scopes: string[] | null | undefined): boolean {
  const set = new Set((scopes || []).map((s) => s.trim()));
  return (
    set.has("https://www.googleapis.com/auth/gmail.compose") ||
    set.has("https://www.googleapis.com/auth/gmail.modify") ||
    set.has("https://mail.google.com/")
  );
}

type ContactRow = {
  id: string;
  email: string;
  first_name: string | null;
  full_name: string | null;
  name: string | null;
  contact_type: string;
  priority_score: number | null;
};

async function pickContacts(
  supabase: SupabaseClient,
  workspaceId: string,
  contactType: "influencer" | "customer",
  limit: number
): Promise<ContactRow[]> {
  let q = supabase
    .from("hq_contacts")
    .select(
      "id, email, first_name, full_name, name, contact_type, priority_score, next_action_type, outreach_status, last_contacted_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("contact_type", contactType)
    .not("email", "is", null)
    .order("priority_score", { ascending: false })
    .limit(Math.max(limit * 3, limit));

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data || []) as Array<ContactRow & {
    next_action_type?: string | null;
    outreach_status?: string | null;
    last_contacted_at?: string | null;
  }>;

  const preferred = rows.filter((c) => {
    const email = normalizeEmail(c.email || "");
    if (!email || !email.includes("@")) return false;
    const status = String(c.outreach_status || "");
    if (["converted", "not_interested", "dormant", "undeliverable"].includes(status)) return false;
    if (c.last_contacted_at) return false;
    return true;
  });

  const intro = preferred.filter((c) => String(c.next_action_type || "") === "INTRODUCTION");
  const pool = intro.length >= limit ? intro : preferred;
  return pool.slice(0, limit).map((c) => ({
    id: String(c.id),
    email: normalizeEmail(c.email),
    first_name: c.first_name,
    full_name: c.full_name,
    name: c.name,
    contact_type: c.contact_type,
    priority_score: c.priority_score,
  }));
}

/**
 * Create personalized Gmail drafts from template drafts. Does NOT send.
 */
export async function prepareOutreachDrafts(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  accessToken: string;
  scopes?: string[] | null;
  fromEmail?: string | null;
  limitPerType?: number;
}): Promise<PrepareDraftsResult> {
  const limit = Math.min(Math.max(Number(args.limitPerType) || 40, 1), 40);
  const result: PrepareDraftsResult = {
    ok: true,
    created: 0,
    byType: {
      influencer: { created: 0, skipped: 0, templateSubject: null },
      customer: { created: 0, skipped: 0, templateSubject: null },
    },
    samples: [],
    errors: [],
  };

  if (!connectionHasComposeScope(args.scopes)) {
    return {
      ...result,
      ok: false,
      needsReconnect: true,
      message:
        "Gmail needs the compose scope to create drafts. Reconnect Gmail in HQ Settings, then try again. Nothing is sent automatically.",
    };
  }

  const drafts = await listDraftSummaries(args.accessToken);
  const templates: Partial<
    Record<DraftTemplateKey, { subject: string; text?: string; html?: string }>
  > = {};

  for (const draft of drafts) {
    const msgId = draft.message?.id;
    if (!msgId) continue;
    let msg: GmailMessage;
    try {
      msg = await getMessageFull(args.accessToken, msgId);
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
      continue;
    }
    const subject = header(msg.payload?.headers, "Subject");
    for (const [key, tpl] of Object.entries(DRAFT_TEMPLATES) as Array<
      [DraftTemplateKey, (typeof DRAFT_TEMPLATES)[DraftTemplateKey]]
    >) {
      if (templates[key]) continue;
      if (!subjectMatchesTemplate(subject, tpl.subjectNeedle)) continue;
      const bodies = extractBodies(msg);
      if (!bodies.html && !bodies.text) {
        result.errors.push(`Template draft “${subject}” has no readable body`);
        continue;
      }
      templates[key] = { subject, ...bodies };
      result.byType[key].templateSubject = subject;
    }
  }

  for (const key of Object.keys(DRAFT_TEMPLATES) as DraftTemplateKey[]) {
    if (!templates[key]) {
      result.ok = false;
      result.errors.push(
        `Could not find a Gmail draft whose subject contains “${DRAFT_TEMPLATES[key].subjectNeedle}”. Keep that draft in Drafts and try again.`
      );
    }
  }
  if (!templates.influencer && !templates.customer) {
    return { ...result, ok: false, message: result.errors[0] };
  }

  for (const key of Object.keys(DRAFT_TEMPLATES) as DraftTemplateKey[]) {
    const tpl = templates[key];
    if (!tpl) continue;
    const contactType = DRAFT_TEMPLATES[key].contactType;
    let contacts: ContactRow[] = [];
    try {
      contacts = await pickContacts(args.supabase, args.workspaceId, contactType, limit);
    } catch (e) {
      result.ok = false;
      result.errors.push(e instanceof Error ? e.message : String(e));
      continue;
    }
    if (!contacts.length) {
      result.errors.push(`No uncontacted ${contactType} contacts with email found in hq_contacts.`);
      continue;
    }

    for (const contact of contacts) {
      const firstName = resolveContactFirstName(contact);
      const subject = personalizeTemplate(tpl.subject, firstName);
      const text = tpl.text ? personalizeTemplate(tpl.text, firstName) : undefined;
      const html = tpl.html ? personalizeTemplate(tpl.html, firstName) : undefined;
      const raw = buildRawMime({
        to: contact.email,
        subject,
        text,
        html,
        from: args.fromEmail || null,
      });
      try {
        await createDraft(args.accessToken, raw);
        result.created += 1;
        result.byType[key].created += 1;
        if (result.samples.length < 6) {
          result.samples.push({
            type: contactType,
            email: contact.email,
            firstName,
            subject,
          });
        }
      } catch (e) {
        result.byType[key].skipped += 1;
        result.errors.push(
          `${contact.email}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200)
        );
        if (result.errors.length > 12) break;
      }
    }
  }

  if (result.created === 0) result.ok = false;
  result.message = result.ok
    ? `Created ${result.created} Gmail drafts. Open Gmail → Drafts, review each, then press Send yourself. Nothing was sent.`
    : result.message || result.errors[0] || "No drafts created";
  return result;
}
