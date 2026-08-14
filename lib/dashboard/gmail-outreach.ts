import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../email-constants";
import { recordOutreachEvent } from "./outreach";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const MAX_MESSAGES = 50;

type GmailHeader = { name?: string; value?: string };
type GmailMessage = {
  id?: string;
  threadId?: string;
  internalDate?: string;
  payload?: { headers?: GmailHeader[] };
  labelIds?: string[];
};

function header(headers: GmailHeader[] | undefined, name: string): string {
  const hit = (headers || []).find((h) => String(h.name || "").toLowerCase() === name.toLowerCase());
  return String(hit?.value || "");
}

function extractEmails(raw: string): string[] {
  const found = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return [...new Set(found.map((e) => normalizeEmail(e)))];
}

async function gmailJson(
  accessToken: string,
  path: string
): Promise<{ ok: boolean; json: Record<string, unknown>; status: number }> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "manual",
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { error: text.slice(0, 180) };
  }
  return { ok: res.ok, json, status: res.status };
}

async function listIds(accessToken: string, query: string): Promise<string[]> {
  const q = encodeURIComponent(query);
  const { ok, json } = await gmailJson(
    accessToken,
    `/messages?q=${q}&maxResults=${MAX_MESSAGES}`
  );
  if (!ok) {
    throw new Error(
      String((json.error as { message?: string } | undefined)?.message || json.error || "Gmail list failed")
    );
  }
  const messages = (json.messages as Array<{ id?: string }> | undefined) || [];
  return messages.map((m) => String(m.id || "")).filter(Boolean);
}

async function getMetadata(accessToken: string, id: string): Promise<GmailMessage> {
  const path =
    `/messages/${encodeURIComponent(id)}?format=metadata` +
    `&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc` +
    `&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-ID`;
  const { ok, json } = await gmailJson(accessToken, path);
  if (!ok) throw new Error(String((json.error as { message?: string })?.message || "Gmail get failed"));
  return json as GmailMessage;
}

export type GmailIngestResult = {
  scanned: number;
  sentLogged: number;
  repliesLogged: number;
  skippedUnmatched: number;
  duplicates: number;
  errors: string[];
};

export async function ingestGmailOutreach(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  accessToken: string;
  connectedEmail?: string | null;
}): Promise<GmailIngestResult> {
  const result: GmailIngestResult = {
    scanned: 0,
    sentLogged: 0,
    repliesLogged: 0,
    skippedUnmatched: 0,
    duplicates: 0,
    errors: [],
  };

  const { data: contacts, error } = await args.supabase
    .from("hq_contacts")
    .select("id, email, normalized_email")
    .eq("workspace_id", args.workspaceId);
  if (error) {
    result.errors.push(error.message);
    return result;
  }

  const byEmail = new Map<string, { id: string; email: string }>();
  for (const c of contacts || []) {
    const key = normalizeEmail(String(c.normalized_email || c.email || ""));
    if (key) byEmail.set(key, { id: String(c.id), email: String(c.email) });
  }
  if (byEmail.size === 0) return result;

  const self = normalizeEmail(args.connectedEmail || "");
  const label = String(process.env.GMAIL_OUTREACH_LABEL || "").trim();
  const labelClause = label ? ` label:${label.replace(/\s+/g, "-")}` : "";
  const sentQuery = `in:sent newer_than:2d -in:chats${labelClause}`;
  const inboxQuery = `in:inbox newer_than:2d -in:chats${labelClause}`;

  let sentIds: string[] = [];
  let inboxIds: string[] = [];
  try {
    sentIds = await listIds(args.accessToken, sentQuery);
    inboxIds = await listIds(args.accessToken, inboxQuery);
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }

  const seen = new Set<string>();
  const all = [
    ...sentIds.map((id) => ({ id, kind: "sent" as const })),
    ...inboxIds.map((id) => ({ id, kind: "inbox" as const })),
  ];

  for (const item of all) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.scanned += 1;
    let msg: GmailMessage;
    try {
      msg = await getMetadata(args.accessToken, item.id);
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
      continue;
    }
    const headers = msg.payload?.headers || [];
    const from = extractEmails(header(headers, "From"));
    const to = extractEmails(`${header(headers, "To")} ${header(headers, "Cc")}`);
    const subject = header(headers, "Subject").slice(0, 300) || null;
    const messageId = header(headers, "Message-ID") || msg.id || null;
    const internalMs = Number(msg.internalDate || 0);
    const at = internalMs ? new Date(internalMs).toISOString() : new Date().toISOString();
    const isSent = item.kind === "sent" || (msg.labelIds || []).includes("SENT");

    if (isSent) {
      const recipients = to.filter((e) => e && e !== self);
      const matched = recipients.map((e) => byEmail.get(e)).filter(Boolean) as Array<{
        id: string;
        email: string;
      }>;
      if (!matched.length) {
        result.skippedUnmatched += 1;
        continue;
      }
      for (const contact of matched) {
        const out = await recordOutreachEvent(args.supabase, {
          contactId: contact.id,
          email: contact.email,
          eventType: "email_sent",
          channel: "gmail",
          direction: "outbound",
          provider: "gmail",
          providerMessageId: messageId,
          threadId: msg.threadId || null,
          subject,
          sentAt: at,
          metadata: { gmail_id: msg.id, connected_account: self || null },
        });
        if (out.inserted) result.sentLogged += 1;
        else if (out.skipped === "duplicate") result.duplicates += 1;
      }
      continue;
    }

    const fromContact = from.map((e) => byEmail.get(e)).find(Boolean);
    if (!fromContact) {
      result.skippedUnmatched += 1;
      continue;
    }
    const out = await recordOutreachEvent(args.supabase, {
      contactId: fromContact.id,
      email: fromContact.email,
      eventType: "email_reply_received",
      channel: "gmail",
      direction: "inbound",
      provider: "gmail",
      providerMessageId: messageId,
      threadId: msg.threadId || null,
      subject,
      receivedAt: at,
      metadata: { gmail_id: msg.id },
    });
    if (out.inserted) result.repliesLogged += 1;
    else if (out.skipped === "duplicate") result.duplicates += 1;
  }

  return result;
}
