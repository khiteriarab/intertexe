import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../email-constants";
import { recordOutreachEvent } from "./outreach";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
/** Cap per query; paginate so a big send batch (e.g. 80) is fully ingested. */
const MAX_MESSAGES = 200;
const PAGE_SIZE = 100;

type GmailHeader = { name?: string; value?: string };
type GmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
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

export function isBounceMessage(input: { from: string[]; subject: string }): boolean {
  const fromBlob = input.from.join(" ").toLowerCase();
  if (/mailer-daemon|postmaster@|mail-delivery-subsystem/.test(fromBlob)) return true;
  return /undeliverable|delivery status notification|returned mail|mail delivery failed|failure notice|delivery failure/.test(
    input.subject.toLowerCase()
  );
}

export function extractBouncedRecipients(input: {
  failedRecipientsHeader: string;
  snippet: string;
  subject: string;
  selfEmail: string;
  knownEmails: Iterable<string>;
}): string[] {
  const known = new Set(input.knownEmails);
  const self = normalizeEmail(input.selfEmail || "");
  const fromHeader = extractEmails(input.failedRecipientsHeader).filter((e) => e && e !== self);
  const matchedHeader = fromHeader.filter((e) => known.has(e));
  if (matchedHeader.length) return [...new Set(matchedHeader)];
  const fromText = extractEmails(`${input.snippet} ${input.subject}`).filter(
    (e) => e && e !== self && known.has(e)
  );
  return [...new Set(fromText)];
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
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < MAX_MESSAGES) {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(Math.min(PAGE_SIZE, MAX_MESSAGES - ids.length)),
    });
    if (pageToken) params.set("pageToken", pageToken);
    const { ok, json } = await gmailJson(accessToken, `/messages?${params.toString()}`);
    if (!ok) {
      throw new Error(
        String((json.error as { message?: string } | undefined)?.message || json.error || "Gmail list failed")
      );
    }
    const messages = (json.messages as Array<{ id?: string }> | undefined) || [];
    for (const m of messages) {
      const id = String(m.id || "");
      if (id) ids.push(id);
    }
    pageToken = typeof json.nextPageToken === "string" ? json.nextPageToken : undefined;
    if (!pageToken || messages.length === 0) break;
  }
  return ids;
}

async function getMetadata(accessToken: string, id: string): Promise<GmailMessage> {
  const path =
    `/messages/${encodeURIComponent(id)}?format=metadata` +
    `&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc` +
    `&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-ID` +
    `&metadataHeaders=X-Failed-Recipients`;
  const { ok, json } = await gmailJson(accessToken, path);
  if (!ok) throw new Error(String((json.error as { message?: string })?.message || "Gmail get failed"));
  return json as GmailMessage;
}

export type GmailIngestResult = {
  scanned: number;
  sentLogged: number;
  repliesLogged: number;
  bouncedLogged: number;
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
    bouncedLogged: 0,
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
  const bounceQuery =
    `(from:mailer-daemon OR from:postmaster OR subject:undeliverable OR subject:"delivery status notification" OR subject:"mail delivery failed" OR subject:"returned mail") newer_than:7d -in:chats`;

  let sentIds: string[] = [];
  let inboxIds: string[] = [];
  let bounceIds: string[] = [];
  try {
    sentIds = await listIds(args.accessToken, sentQuery);
    inboxIds = await listIds(args.accessToken, inboxQuery);
    bounceIds = await listIds(args.accessToken, bounceQuery);
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }

  const seen = new Set<string>();
  const all = [
    ...sentIds.map((id) => ({ id, kind: "sent" as const })),
    ...inboxIds.map((id) => ({ id, kind: "inbox" as const })),
    ...bounceIds.map((id) => ({ id, kind: "bounce" as const })),
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
    const bounce =
      item.kind === "bounce" || isBounceMessage({ from, subject: subject || "" });

    if (bounce) {
      const recipients = extractBouncedRecipients({
        failedRecipientsHeader: header(headers, "X-Failed-Recipients"),
        snippet: String(msg.snippet || ""),
        subject: subject || "",
        selfEmail: self,
        knownEmails: byEmail.keys(),
      });
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
          eventType: "email_bounced",
          channel: "gmail",
          direction: "inbound",
          provider: "gmail",
          providerMessageId: messageId,
          threadId: msg.threadId || null,
          subject,
          receivedAt: at,
          metadata: { gmail_id: msg.id, bounce: true, connected_account: self || null },
        });
        if (out.inserted) result.bouncedLogged += 1;
        else if (out.skipped === "duplicate") result.duplicates += 1;
        else if (out.skipped) result.errors.push(`${contact.email}: ${out.skipped}`.slice(0, 180));
        else result.bouncedLogged += 1;
      }
      continue;
    }

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
