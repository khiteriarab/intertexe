import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeScanURL } from "./url-composition-cache";
import {
  enrichFromUrl,
  enrichmentToAttributes,
  enrichmentIsSufficient,
  materialStatusFromCompositionProvenance,
  mergeEnrichment,
  pageTextSnippetFromHtml,
  preferCaptureImageUrl,
  canonicalizeCaptureImageUrl,
  isUsableCaptureImageUrl,
  type CaptureEnrichment,
} from "./capture-enrichment";
import { enrichGapsWithOpenAI } from "./capture-enrichment-ai";
import {
  findBetterAlternatives,
  findBetterInputFromEnrichment,
  type FindBetterAlternative,
} from "./capture-find-better";
import { fetchPageHTML } from "./scanner/retailer-extraction";
import { getServerSupabase } from "./supabase-service-client";

const MAX_ENRICHMENT_ATTEMPTS = 4;
const ENRICHMENT_LOCK_MS = 3 * 60 * 1000;

export type CaptureItemType =
  | "catalog_product"
  | "external_product"
  | "captured_url"
  | "captured_image";

export type CaptureSourceApp =
  | "ios_app"
  | "ios_share_extension"
  | "chrome_extension"
  | "safari_extension"
  | "web"
  | "api";

export type ResolutionStatus =
  | "saved"
  | "queued"
  | "resolving"
  | "analyzed"
  | "alternatives_ready"
  | "failed";

export type MaterialStatus = "verified" | "source_page" | "ai_estimated" | "unknown";

export type CreateCaptureInput = {
  itemType?: CaptureItemType;
  sourceApp?: CaptureSourceApp;
  originalUrl?: string | null;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
  /** Raw base64 or data-URL; max ~5MB decoded. Uploaded to external-captures bucket. */
  imageBase64?: string | null;
  title?: string | null;
  retailer?: string | null;
  brandName?: string | null;
  price?: number | null;
  currency?: string | null;
  description?: string | null;
  compositionText?: string | null;
  sku?: string | null;
  externalProductId?: string | null;
  collectionId?: string | null;
  decodeNow?: boolean;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadCaptureImage(
  service: SupabaseClient,
  userId: string,
  imageBase64: string
): Promise<{ imageUrl: string; imageStoragePath: string; imageHash: string } | null> {
  const raw = imageBase64.includes(",")
    ? imageBase64.split(",")[1] || ""
    : imageBase64;
  if (!raw) return null;
  const buffer = Buffer.from(raw, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be under 5MB");
  }
  const imageHash = createHash("sha256").update(buffer).digest("hex").slice(0, 32);
  const path = `${userId}/${imageHash}.jpg`;
  const { error } = await service.storage
    .from("external-captures")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;

  const { data: signed } = await service.storage
    .from("external-captures")
    .createSignedUrl(path, 60 * 60 * 24 * 30);

  return {
    imageUrl: signed?.signedUrl || "",
    imageStoragePath: path,
    imageHash,
  };
}

/** Download a remote image (or page screenshot fallback) into capture storage. */
export async function persistCaptureImageFromUrl(
  service: SupabaseClient,
  userId: string,
  imageOrPageUrl: string,
  opts?: { treatAsPage?: boolean }
): Promise<{ imageUrl: string; imageStoragePath: string } | null> {
  const sources: string[] = [];
  if (opts?.treatAsPage || !isUsableCaptureImageUrl(imageOrPageUrl)) {
    sources.push(
      `https://image.thum.io/get/auth/no-animate/width/800/${imageOrPageUrl}`,
      `https://image.thum.io/get/width/800/crop/1000/${imageOrPageUrl}`
    );
  } else {
    sources.push(imageOrPageUrl);
    sources.push(
      `https://image.thum.io/get/auth/no-animate/width/800/${imageOrPageUrl}`
    );
  }

  for (const src of sources) {
    try {
      const res = await fetch(src, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const ctype = (res.headers.get("content-type") || "").toLowerCase();
      if (!ctype.includes("image")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) continue;
      const imageHash = createHash("sha256").update(buffer).digest("hex").slice(0, 32);
      const ext = ctype.includes("png") ? "png" : ctype.includes("webp") ? "webp" : "jpg";
      const path = `${userId}/${imageHash}.${ext}`;
      const { error } = await service.storage
        .from("external-captures")
        .upload(path, buffer, { contentType: ctype.split(";")[0], upsert: true });
      if (error) continue;
      const { data: signed } = await service.storage
        .from("external-captures")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      if (!signed?.signedUrl) continue;
      return { imageUrl: signed.signedUrl, imageStoragePath: path };
    } catch {
      /* try next source */
    }
  }
  return null;
}

export function hashUrl(raw: string | null | undefined): string | null {
  const normalized = normalizeScanURL(raw || "");
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

export function sanitizeCaptureUrl(raw: string | null | undefined): string | null {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (!/^https?:$/i.test(u.protocol)) return null;
    return normalizeScanURL(u.toString()) || null;
  } catch {
    return null;
  }
}

export async function insertCapture(
  supabase: SupabaseClient,
  userId: string,
  input: CreateCaptureInput,
  opts?: { serviceClient?: SupabaseClient | null }
) {
  const originalUrl = sanitizeCaptureUrl(input.originalUrl);
  const canonicalUrl = originalUrl;
  const urlHash = hashUrl(originalUrl);

  let imageUrl = input.imageUrl || null;
  let imageStoragePath = input.imageStoragePath || null;
  let imageHash: string | null = null;

  if (input.imageBase64 && opts?.serviceClient) {
    const uploaded = await uploadCaptureImage(opts.serviceClient, userId, input.imageBase64);
    if (uploaded) {
      imageUrl = uploaded.imageUrl || imageUrl;
      imageStoragePath = uploaded.imageStoragePath;
      imageHash = uploaded.imageHash;
    }
  }

  const itemType: CaptureItemType =
    input.itemType ||
    (originalUrl
      ? "captured_url"
      : imageUrl || imageStoragePath
        ? "captured_image"
        : "captured_url");

  const decodeNow = Boolean(input.decodeNow);
  const hostRetailer = (() => {
    try {
      const host = new URL(canonicalUrl || originalUrl || "").hostname.replace(/^www\./i, "");
      return host || null;
    } catch {
      return null;
    }
  })();
  const row = {
    user_id: userId,
    item_type: itemType,
    source_app: input.sourceApp || "ios_app",
    original_url: originalUrl,
    canonical_url: canonicalUrl,
    url_hash: urlHash,
    image_url: imageUrl,
    image_storage_path: imageStoragePath,
    image_hash: imageHash,
    title: input.title?.trim() || hostRetailer,
    retailer: input.retailer?.trim() || hostRetailer,
    brand_name: input.brandName?.trim() || null,
    price: input.price ?? null,
    currency: input.currency?.trim() || null,
    description: input.description?.trim() || null,
    composition_text: input.compositionText?.trim() || null,
    sku: input.sku?.trim() || null,
    external_product_id: input.externalProductId?.trim() || null,
    collection_id: input.collectionId || null,
    resolution_status: decodeNow ? "queued" : "saved",
    material_status: input.compositionText ? "source_page" : "unknown",
    decode_requested: decodeNow,
    decode_requested_at: decodeNow ? new Date().toISOString() : null,
    enrichment_status: "pending",
  };

  // Duplicate detection: same user + url_hash or image_hash
  if (urlHash || imageHash) {
    let query = supabase
      .from("external_captures")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (urlHash) query = query.eq("url_hash", urlHash);
    else if (imageHash) query = query.eq("image_hash", imageHash);
    const { data: existing } = await query.maybeSingle();
    if (existing) {
      if (input.collectionId && existing.collection_id !== input.collectionId) {
        await addCaptureToCollection(supabase, userId, input.collectionId, existing.id);
      }
      return { capture: existing, duplicate: true as const };
    }
  }

  const { data, error } = await supabase
    .from("external_captures")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;

  if (input.collectionId) {
    await addCaptureToCollection(supabase, userId, input.collectionId, data.id);
  }

  await supabase.from("capture_events").insert({
    user_id: userId,
    capture_id: data.id,
    event_type: "capture_created",
    source_app: row.source_app,
    metadata: { item_type: itemType, decode_now: decodeNow },
  });

  return { capture: data, duplicate: false as const };
}

export async function addCaptureToCollection(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string,
  captureId: string
) {
  const { error } = await supabase.from("user_collection_items").upsert(
    {
      collection_id: collectionId,
      user_id: userId,
      item_kind: "external_capture",
      capture_id: captureId,
      product_id: null,
      sort_order: 0,
    },
    { onConflict: "collection_id,capture_id" }
  );
  // Unique index is partial — onConflict may not map; fall back to ignore duplicate errors
  if (error && !/duplicate|unique/i.test(error.message)) {
    // Try plain insert
    await supabase.from("user_collection_items").insert({
      collection_id: collectionId,
      user_id: userId,
      item_kind: "external_capture",
      capture_id: captureId,
      product_id: null,
      sort_order: 0,
    });
  }

  await supabase.from("capture_events").insert({
    user_id: userId,
    capture_id: captureId,
    event_type: "saved_to_collection",
    metadata: { collection_id: collectionId },
  });
}

/**
 * Persist URL enrichment onto external_captures only (never products/live_products).
 */
function isPlaceholderTitle(title: unknown, retailer: unknown): boolean {
  const t = String(title || "")
    .trim()
    .toLowerCase();
  if (!t) return true;
  const host = String(retailer || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (host && (t === host || t === `www.${host}`)) return true;
  // Bare domain-looking titles from share extension
  if (/^[a-z0-9.-]+\.(com|co|net|org|io|shop)(\.[a-z]{2})?$/i.test(t)) return true;
  return false;
}

function isJunkComposition(text: unknown): boolean {
  const t = String(text || "").trim();
  if (!t) return true;
  if (t.length < 8) return true;
  if (/%\s*(off|off your|shipping|discount)/i.test(t)) return true;
  if (!/\d+\s*%/.test(t) && !/\b(cotton|linen|silk|wool|cashmere|viscose|polyester|elastane|nylon|polyamide)\b/i.test(t)) {
    return true;
  }
  return false;
}

function enrichmentPatch(
  enrichment: CaptureEnrichment,
  existing: Record<string, unknown>,
  extras?: {
    resolutionStatus?: ResolutionStatus;
    alternatives?: FindBetterAlternative[] | null;
    materialStatus?: MaterialStatus;
    naturalFiberPercent?: number | null;
    fiberBreakdown?: unknown;
    materialConfidence?: string | null;
  }
) {
  const alts = extras?.alternatives;
  const preferTitle =
    enrichment.title && isPlaceholderTitle(existing.title, existing.retailer)
      ? enrichment.title
      : (existing.title as string) || enrichment.title;
  const preferComposition = isJunkComposition(existing.composition_text)
    ? enrichment.compositionText
    : (existing.composition_text as string) || enrichment.compositionText;
  const preferBrand =
    !existing.brand_name ||
    String(existing.brand_name).toLowerCase() === "core" ||
    String(existing.brand_name).toLowerCase() === String(existing.retailer || "").toLowerCase()
      ? enrichment.brand || (existing.brand_name as string)
      : (existing.brand_name as string) || enrichment.brand;

  const pageUrl =
    (existing.canonical_url as string) ||
    (existing.original_url as string) ||
    null;
  const preferImage = preferCaptureImageUrl(
    existing.image_url as string | null,
    enrichment.imageUrl,
    pageUrl
  );

  return {
    title: preferTitle,
    brand_name: preferBrand,
    retailer: (existing.retailer as string) || enrichment.retailer,
    price: existing.price ?? enrichment.price,
    currency: (existing.currency as string) || enrichment.currency,
    description: (existing.description as string) || enrichment.description,
    composition_text: preferComposition,
    image_url: preferImage,
    category: enrichment.category,
    subcategory: enrichment.subcategory,
    color: enrichment.color,
    pattern: enrichment.pattern,
    silhouette: enrichment.silhouette,
    fit: enrichment.fit,
    length: enrichment.length,
    distinctive_details: enrichment.distinctiveDetails,
    attributes: enrichmentToAttributes(enrichment),
    match_brief: enrichment.matchBrief,
    provenance: enrichment.provenance,
    enrichment_status: "ready",
    material_status:
      extras?.materialStatus ||
      materialStatusFromCompositionProvenance(
        enrichment.provenance,
        preferComposition
      ),
    material_confidence:
      extras?.materialConfidence ??
      enrichment.provenance?.compositionText?.source ??
      null,
    ...(extras?.naturalFiberPercent != null
      ? { natural_fiber_percent: extras.naturalFiberPercent }
      : {}),
    ...(extras?.fiberBreakdown != null ? { fiber_breakdown: extras.fiberBreakdown } : {}),
    ...(extras?.resolutionStatus
      ? { resolution_status: extras.resolutionStatus }
      : {}),
    ...(alts
      ? {
          alternatives: alts,
          alternatives_ready_at: alts.length ? new Date().toISOString() : null,
        }
      : {}),
  };
}

/**
 * Light metadata enrichment (OG/title/image/price/category). Always safe async after save.
 * Durable state machine: pending → enriching → ready | enrichment_retry | needs_information | failed
 * Does NOT write products. Skips Find Better alternatives unless decode was requested.
 */
export async function enrichCaptureMetadata(
  supabase: SupabaseClient,
  userId: string,
  captureId: string,
  opts?: { force?: boolean; findAlternatives?: boolean }
) {
  const claimed = await claimEnrichmentLock(supabase, userId, captureId, opts?.force === true);
  if (!claimed.ok) {
    return claimed.capture;
  }

  const capture = claimed.capture;
  const url = (capture.canonical_url || capture.original_url) as string | null;
  if (!url) {
    await supabase
      .from("external_captures")
      .update({
        enrichment_status: "skipped",
        enrichment_locked_at: null,
        error_message: "No source URL",
      })
      .eq("id", captureId);
    return capture;
  }

  try {
    let enrichment = await enrichFromUrl(url);

    // OpenAI fallback only when deterministic extraction is insufficient
    let aiUsed = false;
    let aiModel: string | null = null;
    let aiTokens: number | null = null;
    if (!enrichmentIsSufficient(enrichment)) {
      let snippet = "";
      try {
        const html = await fetchPageHTML(url);
        snippet = pageTextSnippetFromHtml(html || "");
      } catch {
        snippet = "";
      }
      const ai = await enrichGapsWithOpenAI({
        url,
        existing: enrichment,
        pageTextSnippet: snippet,
        imageUrl: enrichment.imageUrl,
      });
      if (!ai.skipped) {
        enrichment = mergeEnrichment(enrichment, ai.patch, ai.provenance);
        aiUsed = true;
        aiModel = ai.usage.model;
        aiTokens = ai.usage.totalTokens;
        await logCaptureAiUsage(userId, captureId, ai.usage);
      }
    }

    const materialStatus = materialStatusFromCompositionProvenance(
      enrichment.provenance,
      enrichment.compositionText
    );

    let alternatives: FindBetterAlternative[] | null = null;
    let resolutionStatus: ResolutionStatus | undefined;
    const shouldFindAlts =
      opts?.findAlternatives === true || Boolean(capture.decode_requested);

    if (shouldFindAlts) {
      try {
        const fbInput = findBetterInputFromEnrichment(enrichment, {
          naturalFiberPercent:
            typeof capture.natural_fiber_percent === "number"
              ? capture.natural_fiber_percent
              : null,
        });
        alternatives = await findBetterAlternatives(supabase, fbInput);
        resolutionStatus = alternatives.length ? "alternatives_ready" : "analyzed";
      } catch (e) {
        console.warn("[enrichCaptureMetadata] TX Match alternatives failed", e);
        resolutionStatus = "analyzed";
        alternatives = [];
      }
    }

    const sufficient = enrichmentIsSufficient(enrichment);
    const hasUsableTitle =
      Boolean(enrichment.title) &&
      !isPlaceholderTitle(enrichment.title, enrichment.retailer || enrichment.brand);
    const hasAlts = (alternatives?.length || 0) > 0;
    // TX Matches + a real title means the Inspiration is usable — don't leave it
    // labeled "needs_information" just because price/category gaps remain.
    const enrichmentStatus = sufficient
      ? "ready"
      : hasAlts && hasUsableTitle
        ? "ready"
        : hasUsableTitle
          ? "needs_information"
          : "enrichment_retry";

    // Persist a durable image when the retailer CDN is blocked / HTML was stored as image.
    const pageUrl = url;
    let imageUrl = preferCaptureImageUrl(
      capture.image_url as string | null,
      enrichment.imageUrl,
      pageUrl
    );
    const service = getServerSupabase();
    if (
      service &&
      (!imageUrl || !isUsableCaptureImageUrl(imageUrl, pageUrl))
    ) {
      const persisted = await persistCaptureImageFromUrl(
        service,
        userId,
        pageUrl,
        { treatAsPage: true }
      );
      if (persisted?.imageUrl) {
        imageUrl = persisted.imageUrl;
        enrichment = { ...enrichment, imageUrl };
      }
    } else if (service && imageUrl && /allsaints\.com|net-a-porter\.com/i.test(imageUrl)) {
      // Hotlink-prone hosts: mirror into our storage when fetchable.
      const persisted = await persistCaptureImageFromUrl(service, userId, imageUrl);
      if (persisted?.imageUrl) {
        imageUrl = persisted.imageUrl;
        enrichment = { ...enrichment, imageUrl };
      }
    }

    const patch = {
      ...enrichmentPatch(enrichment, capture, {
        materialStatus,
        resolutionStatus,
        alternatives: alternatives ?? undefined,
      }),
      image_url: imageUrl,
      enrichment_status: enrichmentStatus,
      enrichment_locked_at: null,
      enrichment_next_retry_at:
        enrichmentStatus === "ready"
          ? null
          : new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      enrichment_ai_used: aiUsed || Boolean(capture.enrichment_ai_used),
      enrichment_ai_model: aiModel || capture.enrichment_ai_model || null,
      enrichment_ai_at: aiUsed ? new Date().toISOString() : capture.enrichment_ai_at || null,
      enrichment_ai_tokens: aiTokens ?? capture.enrichment_ai_tokens ?? null,
      error_message: enrichmentStatus === "ready" ? null : "Enrichment incomplete — will retry",
      // Never lose original URL
      original_url: capture.original_url,
      canonical_url: capture.canonical_url || capture.original_url,
    };

    // Soft-fail columns that may not exist pre-migration
    let { data: updated, error: upErr } = await supabase
      .from("external_captures")
      .update(patch)
      .eq("id", captureId)
      .select("*")
      .single();

    if (upErr && /column|schema cache/i.test(upErr.message)) {
      const {
        enrichment_ai_used: _a,
        enrichment_ai_model: _b,
        enrichment_ai_at: _c,
        enrichment_ai_tokens: _d,
        enrichment_next_retry_at: _e,
        enrichment_locked_at: _f,
        ...core
      } = patch as Record<string, unknown>;
      ({ data: updated, error: upErr } = await supabase
        .from("external_captures")
        .update(core)
        .eq("id", captureId)
        .select("*")
        .single());
    }
    if (upErr) throw upErr;

    await supabase.from("capture_events").insert({
      user_id: userId,
      capture_id: captureId,
      event_type: "enrichment_succeeded",
      metadata: {
        sufficient,
        ai_used: aiUsed,
        ai_tokens: aiTokens,
        alternatives_count: alternatives?.length ?? 0,
      },
    });

    return updated;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Enrichment failed";
    const attempts = Number(capture.enrichment_attempt_count || 0);
    const status =
      attempts >= MAX_ENRICHMENT_ATTEMPTS ? "failed" : "enrichment_retry";
    await supabase
      .from("external_captures")
      .update({
        enrichment_status: status,
        enrichment_locked_at: null,
        enrichment_next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        error_message: message,
      })
      .eq("id", captureId);

    await supabase.from("capture_events").insert({
      user_id: userId,
      capture_id: captureId,
      event_type: "enrichment_failed",
      metadata: { error: message, status, attempts },
    });
    throw e;
  }
}

type ClaimResult =
  | { ok: true; capture: Record<string, unknown> }
  | { ok: false; capture: Record<string, unknown> | null; reason: string };

async function claimEnrichmentLock(
  supabase: SupabaseClient,
  userId: string,
  captureId: string,
  force: boolean
): Promise<ClaimResult> {
  const { data: capture, error } = await supabase
    .from("external_captures")
    .select("*")
    .eq("id", captureId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!capture) return { ok: false, capture: null, reason: "not_found" };

  const status = String(capture.enrichment_status || "pending");
  const lockedAt = capture.enrichment_locked_at
    ? new Date(String(capture.enrichment_locked_at)).getTime()
    : 0;
  const lockFresh =
    (status === "enriching" || status === "running") &&
    lockedAt > 0 &&
    Date.now() - lockedAt < ENRICHMENT_LOCK_MS;

  if (lockFresh && !force) {
    return { ok: false, capture, reason: "locked" };
  }

  const attempts = Number(capture.enrichment_attempt_count || 0);
  if (!force && status === "ready" && !isCaptureEnrichmentIncomplete(capture)) {
    return { ok: false, capture, reason: "already_ready" };
  }
  if (!force && attempts >= MAX_ENRICHMENT_ATTEMPTS && status === "failed") {
    return { ok: false, capture, reason: "max_attempts" };
  }

  const nextAttempt = attempts + 1;
  const { data: claimed, error: claimErr } = await supabase
    .from("external_captures")
    .update({
      enrichment_status: "enriching",
      enrichment_locked_at: new Date().toISOString(),
      enrichment_attempt_count: nextAttempt,
      error_message: null,
    })
    .eq("id", captureId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (claimErr && /column|schema cache/i.test(claimErr.message)) {
    // Pre-migration: fall back to running without lock columns
    const { data: claimedLegacy } = await supabase
      .from("external_captures")
      .update({ enrichment_status: "running" })
      .eq("id", captureId)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (!claimedLegacy) return { ok: false, capture, reason: "claim_failed" };
    return { ok: true, capture: { ...claimedLegacy, enrichment_attempt_count: nextAttempt } };
  }

  if (claimErr) throw claimErr;
  if (!claimed) return { ok: false, capture, reason: "claim_failed" };
  return { ok: true, capture: claimed };
}

export function isCaptureEnrichmentIncomplete(capture: Record<string, unknown>): boolean {
  const status = String(capture.enrichment_status || "pending");
  if (
    status === "pending" ||
    status === "enrichment_retry" ||
    status === "needs_information" ||
    status === "failed"
  ) {
    return true;
  }
  if (isPlaceholderTitle(capture.title, capture.retailer)) return true;
  if (!capture.image_url && (capture.original_url || capture.canonical_url)) return true;
  // Stale enriching lock
  if (status === "enriching" || status === "running") {
    const lockedAt = capture.enrichment_locked_at
      ? new Date(String(capture.enrichment_locked_at)).getTime()
      : 0;
    if (!lockedAt || Date.now() - lockedAt >= ENRICHMENT_LOCK_MS) return true;
  }
  return false;
}

/**
 * Opening an Inspiration recovers stalled/failed enrichment without re-sharing.
 * Safe against duplicate concurrent workers via claimEnrichmentLock.
 */
export async function recoverCaptureEnrichment(
  supabase: SupabaseClient,
  userId: string,
  captureId: string
): Promise<{ triggered: boolean; reason: string }> {
  const { data: capture } = await supabase
    .from("external_captures")
    .select("*")
    .eq("id", captureId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!capture) return { triggered: false, reason: "not_found" };
  if (!isCaptureEnrichmentIncomplete(capture)) {
    return { triggered: false, reason: "complete" };
  }
  // Prefer service client for background recovery when available
  const client = getServerSupabase() || supabase;
  const findAlts = Boolean(capture.decode_requested);
  // Fire work; caller should schedule via after()
  await enrichCaptureMetadata(client, userId, captureId, {
    findAlternatives: findAlts,
  }).catch((e) => {
    console.error("[recoverCaptureEnrichment]", captureId, e);
  });
  return { triggered: true, reason: "recovered" };
}

async function logCaptureAiUsage(
  userId: string,
  captureId: string,
  usage: {
    model: string;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    at: string;
  }
) {
  try {
    const sb = getServerSupabase();
    if (!sb) return;
    const key = "ai_usage:capture_enrichment";
    const { data } = await sb
      .from("system_status")
      .select("value_json")
      .eq("key", key)
      .maybeSingle();
    const prev = (data?.value_json || {}) as Record<string, unknown>;
    const calls = Number(prev.calls || 0) + 1;
    const tokens = Number(prev.total_tokens || 0) + Number(usage.totalTokens || 0);
    await sb.from("system_status").upsert({
      key,
      value_json: {
        calls,
        total_tokens: tokens,
        last_model: usage.model,
        last_capture_id: captureId,
        last_user_id: userId,
        last_prompt_tokens: usage.promptTokens,
        last_completion_tokens: usage.completionTokens,
        last_at: usage.at,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[logCaptureAiUsage] failed", e);
  }
}

/**
 * Decode / Find Better: reuse URL composition cache + scan API when available,
 * then always run standalone URL enrichment + catalog alternatives.
 * Does NOT write into products / live_products.
 */
export async function decodeCapture(
  supabase: SupabaseClient,
  userId: string,
  captureId: string,
  opts?: { accessToken?: string; siteOrigin?: string; findAlternatives?: boolean }
) {
  const findAlternatives = opts?.findAlternatives !== false;

  const { data: capture, error } = await supabase
    .from("external_captures")
    .select("*")
    .eq("id", captureId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!capture) throw new Error("Capture not found");

  await supabase
    .from("external_captures")
    .update({
      resolution_status: "resolving",
      decode_requested: true,
      decode_requested_at: new Date().toISOString(),
      enrichment_status: "running",
    })
    .eq("id", captureId);

  await supabase.from("capture_events").insert({
    user_id: userId,
    capture_id: captureId,
    event_type: "decode_started",
    source_app: capture.source_app,
  });

  try {
    let working: Record<string, unknown> = { ...capture };
    let via = "enrichment";
    let scanAlternatives: unknown[] | null = null;

    // 1) Exact URL composition cache
    if (capture.canonical_url || capture.original_url) {
      const url = capture.canonical_url || capture.original_url;
      const { data: cached } = await supabase
        .from("url_compositions")
        .select("*")
        .eq("url", url)
        .maybeSingle();

      if (cached?.composition) {
        working = {
          ...working,
          title: working.title || cached.product_name,
          brand_name: working.brand_name || cached.brand_name,
          composition_text: cached.composition,
          natural_fiber_percent: cached.natural_percent,
          fiber_breakdown: cached.fiber_breakdown,
          image_url: working.image_url || cached.image_url,
          material_status: "source_page",
          material_confidence: "database",
        };
        via = "url_compositions";
      }
    }

    // 2) Standalone URL enrichment (works without accessToken / Leset etc.)
    let enrichment: CaptureEnrichment | null = null;
    const pageUrl = (working.canonical_url ||
      working.original_url ||
      capture.canonical_url ||
      capture.original_url) as string | null;

    if (pageUrl) {
      try {
        enrichment = await enrichFromUrl(pageUrl);
        if (!enrichmentIsSufficient(enrichment)) {
          let snippet = "";
          try {
            const html = await fetchPageHTML(pageUrl);
            snippet = pageTextSnippetFromHtml(html || "");
          } catch {
            snippet = "";
          }
          const ai = await enrichGapsWithOpenAI({
            url: pageUrl,
            existing: enrichment,
            pageTextSnippet: snippet,
            imageUrl: (working.image_url as string) || enrichment.imageUrl,
          });
          if (!ai.skipped) {
            enrichment = mergeEnrichment(enrichment, ai.patch, ai.provenance);
            via = `${via}+openai`;
            await logCaptureAiUsage(userId, captureId, ai.usage);
            working.enrichment_ai_used = true;
            working.enrichment_ai_model = ai.usage.model;
            working.enrichment_ai_tokens = ai.usage.totalTokens;
            working.enrichment_ai_at = ai.usage.at;
          }
        }
        working = {
          ...working,
          ...enrichmentPatch(enrichment, working),
        };
        if (via === "enrichment") via = "url_enrichment";
        else via = `${via}+url_enrichment`;
      } catch (e) {
        console.warn("[decodeCapture] enrichFromUrl failed", e);
      }
    }

    // 3) Optional scan API assist — never block TX Match on a hung scanner path.
    // Chrome / Share Extension already send structured hints; enrichment is authoritative.
    const origin =
      opts?.siteOrigin || process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com";
    const sourceApp = String(capture.source_app || "");
    const skipScanAssist =
      sourceApp === "chrome_extension" || sourceApp === "safari_extension";
    if (
      !skipScanAssist &&
      (capture.original_url || capture.image_url) &&
      opts?.accessToken
    ) {
      const body: Record<string, unknown> = {
        session_id: `capture_${captureId}`,
      };
      if (capture.original_url) {
        body.url = capture.original_url;
        body.scan_source = "url";
      } else if (capture.image_url) {
        body.image_url = capture.image_url;
        body.scan_source = "image";
        body.ai_assist = true;
      }

      try {
        const controller = new AbortController();
        const scanTimer = setTimeout(() => controller.abort(), 20_000);
        const res = await fetch(`${origin}/api/scan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${opts.accessToken}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(scanTimer);

        if (res.ok) {
          const json = (await res.json()) as {
            tagInfo?: {
              brand?: string;
              productName?: string;
              composition?: string;
              productImageUrl?: string;
              confidence?: string;
            };
            naturalPercent?: number;
            fiberBreakdown?: unknown;
            matched?: boolean;
            betterAlternatives?: unknown[];
          };

          const confidence = String(json.tagInfo?.confidence || "").toLowerCase();
          let materialStatus: MaterialStatus = "unknown";
          if (json.tagInfo?.composition) {
            if (
              confidence.includes("database") ||
              confidence.includes("label") ||
              confidence.includes("confirmed") ||
              confidence.includes("source")
            ) {
              materialStatus = confidence.includes("database") ? "verified" : "source_page";
            } else if (
              confidence.includes("ai") ||
              confidence.includes("estimate") ||
              confidence.includes("infer") ||
              confidence.includes("vision")
            ) {
              materialStatus = "ai_estimated";
            } else if (confidence.includes("high") || confidence.includes("medium")) {
              materialStatus = "source_page";
            } else {
              materialStatus = "ai_estimated";
            }
          }

          working = {
            ...working,
            title: working.title || json.tagInfo?.productName || null,
            brand_name: working.brand_name || json.tagInfo?.brand || null,
            composition_text: json.tagInfo?.composition || working.composition_text,
            natural_fiber_percent: json.naturalPercent ?? working.natural_fiber_percent,
            fiber_breakdown: json.fiberBreakdown || working.fiber_breakdown,
            image_url: working.image_url || json.tagInfo?.productImageUrl || null,
            material_status: materialStatus,
            material_confidence: json.tagInfo?.confidence || working.material_confidence,
          };
          if (json.betterAlternatives?.length) {
            scanAlternatives = json.betterAlternatives;
          }
          via = `${via}+api_scan`;
        }
      } catch (e) {
        console.warn("[decodeCapture] /api/scan assist skipped", e);
      }
    }

    // 4) Find Better alternatives from verified catalog (never products writes)
    let alternatives: FindBetterAlternative[] = [];
    if (findAlternatives) {
      const fbInput = enrichment
        ? findBetterInputFromEnrichment(enrichment, {
            naturalFiberPercent:
              (working.natural_fiber_percent as number | null) ?? null,
          })
        : {
            title: (working.title as string) || null,
            brand: (working.brand_name as string) || null,
            price: (working.price as number) ?? null,
            currency: (working.currency as string) || null,
            compositionText: (working.composition_text as string) || null,
            category: (working.category as string) || null,
            subcategory: (working.subcategory as string) || null,
            naturalFiberPercent:
              (working.natural_fiber_percent as number | null) ?? null,
            region: "us",
          };

      // Prefer enriched price/title if working already merged
      fbInput.price = (working.price as number) ?? fbInput.price;
      fbInput.title = (working.title as string) || fbInput.title;
      fbInput.compositionText =
        (working.composition_text as string) || fbInput.compositionText;
      fbInput.naturalFiberPercent =
        (working.natural_fiber_percent as number | null) ?? fbInput.naturalFiberPercent;

      try {
        alternatives = await findBetterAlternatives(supabase, fbInput);
      } catch (e) {
        console.warn("[decodeCapture] findBetterAlternatives failed", e);
      }

      // Fall back to scan alternatives shape if catalog returned nothing
      if (!alternatives.length && scanAlternatives?.length) {
        alternatives = (scanAlternatives as Record<string, unknown>[]).map((a, i) => ({
          id: String(a.id || a.product_id || `scan_${i}`),
          name: String(a.name || a.product_name || ""),
          brand_name: (a.brand_name as string) || null,
          brand_slug: (a.brand_slug as string) || null,
          image_url: (a.image_url as string) || null,
          price: (a.price as number | string) ?? null,
          currency: (a.currency as string) || "USD",
          composition: (a.composition as string) || null,
          natural_fiber_percent:
            a.natural_fiber_percent != null ? Number(a.natural_fiber_percent) : null,
          category: (a.category as string) || null,
          why: String(a.why || a.priceMatchNote || "Similar piece in better materials"),
        }));
      }
    }

    const resolutionStatus: ResolutionStatus = alternatives.length
      ? "alternatives_ready"
      : "analyzed";

    const patch: Record<string, unknown> = {
      title: working.title || null,
      brand_name: working.brand_name || null,
      retailer: working.retailer || null,
      price: working.price ?? null,
      currency: working.currency || null,
      description: working.description || null,
      composition_text: working.composition_text || null,
      image_url: working.image_url || null,
      natural_fiber_percent: working.natural_fiber_percent ?? null,
      fiber_breakdown: working.fiber_breakdown || null,
      material_status: (working.material_status as MaterialStatus) ||
        (enrichment
          ? materialStatusFromCompositionProvenance(
              enrichment.provenance,
              (working.composition_text as string) || enrichment.compositionText
            )
          : working.composition_text
            ? "source_page"
            : "unknown"),
      material_confidence: working.material_confidence || null,
      category: working.category || null,
      subcategory: working.subcategory || null,
      color: working.color || null,
      pattern: working.pattern || null,
      silhouette: working.silhouette || null,
      fit: working.fit || null,
      length: working.length || null,
      distinctive_details: working.distinctive_details || enrichment?.distinctiveDetails || [],
      attributes: working.attributes || (enrichment ? enrichmentToAttributes(enrichment) : null),
      match_brief: working.match_brief || enrichment?.matchBrief || null,
      provenance: working.provenance || enrichment?.provenance || null,
      enrichment_status:
        enrichment || alternatives.length
          ? "ready"
          : pageUrl
            ? "enrichment_retry"
            : "skipped",
      enrichment_locked_at: null,
      enrichment_ai_used: Boolean(working.enrichment_ai_used),
      enrichment_ai_model: (working.enrichment_ai_model as string) || null,
      enrichment_ai_at: (working.enrichment_ai_at as string) || null,
      enrichment_ai_tokens:
        working.enrichment_ai_tokens != null ? Number(working.enrichment_ai_tokens) : null,
      resolution_status: resolutionStatus,
      alternatives: alternatives.length ? alternatives : null,
      alternatives_ready_at: alternatives.length ? new Date().toISOString() : null,
      decoded_at: new Date().toISOString(),
      error_message: null,
    };

    const { data: updated, error: upErr } = await supabase
      .from("external_captures")
      .update(patch)
      .eq("id", captureId)
      .select("*")
      .single();
    if (upErr) throw upErr;

    await supabase.from("capture_events").insert({
      user_id: userId,
      capture_id: captureId,
      event_type: "decode_succeeded",
      metadata: {
        via,
        alternatives_count: alternatives.length,
        enrichment: Boolean(enrichment),
      },
    });

    return updated;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Decode failed";
    await supabase
      .from("external_captures")
      .update({
        resolution_status: "failed",
        enrichment_status: "failed",
        error_message: message,
      })
      .eq("id", captureId);

    await supabase.from("capture_events").insert({
      user_id: userId,
      capture_id: captureId,
      event_type: "decode_failed",
      metadata: { error: message },
    });

    throw e;
  }
}
