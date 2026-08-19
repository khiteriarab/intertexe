import { getServerSupabase } from "./supabase-service-client";
import { buildCaptureResultView } from "./capture-result";
import { buildTxMatchCopyFromCapture, buildTxMatchLinks } from "./tx-match-copy";

/** Sentinel owner for match sets created without an INTERTEXE account. */
export const PUBLIC_MATCH_OWNER = "public_extension";

export function isPublicMatchOwner(userId: string | null | undefined): boolean {
  return String(userId || "") === PUBLIC_MATCH_OWNER;
}

export function safeInternalPath(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (value.includes("://")) return null;
  return value;
}

export function publicCaptureRow(row: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!row || typeof row !== "object") return null;
  const {
    user_id: _userId,
    collection_id: _collectionId,
    image_storage_path: _storage,
    image_hash: _imageHash,
    url_hash: _urlHash,
    ...rest
  } = row;
  return rest;
}

export function publicMatchResponse(row: Record<string, unknown>) {
  const capture = publicCaptureRow(row) || row;
  const id = capture.id != null ? String(capture.id) : null;
  const links = buildTxMatchLinks(id);
  return {
    capture,
    copy: buildTxMatchCopyFromCapture(capture),
    view: buildCaptureResultView(capture),
    links,
  };
}

export async function loadPublicCapture(id: string): Promise<Record<string, unknown> | null> {
  const supabase = getServerSupabase();
  if (!supabase || !id) return null;
  const { data, error } = await supabase.from("external_captures").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}
