import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeScanURL } from "./url-composition-cache";

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
    title: input.title?.trim() || null,
    retailer: input.retailer?.trim() || null,
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
 * Decode: reuse URL composition cache + /api/scan resolution path lightly.
 * Does NOT write into products / live_products.
 */
export async function decodeCapture(
  supabase: SupabaseClient,
  userId: string,
  captureId: string,
  opts?: { accessToken?: string; siteOrigin?: string }
) {
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
    })
    .eq("id", captureId);

  await supabase.from("capture_events").insert({
    user_id: userId,
    capture_id: captureId,
    event_type: "decode_started",
    source_app: capture.source_app,
  });

  try {
    // 1) Exact URL composition cache
    if (capture.canonical_url || capture.original_url) {
      const url = capture.canonical_url || capture.original_url;
      const { data: cached } = await supabase
        .from("url_compositions")
        .select("*")
        .eq("url", url)
        .maybeSingle();

      if (cached?.composition) {
        const patch = {
          title: capture.title || cached.product_name,
          brand_name: capture.brand_name || cached.brand_name,
          composition_text: cached.composition,
          natural_fiber_percent: cached.natural_percent,
          fiber_breakdown: cached.fiber_breakdown,
          image_url: capture.image_url || cached.image_url,
          material_status: "source_page" as MaterialStatus,
          material_confidence: "database",
          resolution_status: "analyzed" as ResolutionStatus,
          decoded_at: new Date().toISOString(),
        };
        const { data: updated } = await supabase
          .from("external_captures")
          .update(patch)
          .eq("id", captureId)
          .select("*")
          .single();

        await supabase.from("capture_events").insert({
          user_id: userId,
          capture_id: captureId,
          event_type: "decode_succeeded",
          metadata: { via: "url_compositions" },
        });

        return updated;
      }
    }

    // 2) Call existing scan API for URL/image when available
    const origin = opts?.siteOrigin || process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com";
    if ((capture.original_url || capture.image_url) && opts?.accessToken) {
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

      const res = await fetch(`${origin}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.accessToken}`,
        },
        body: JSON.stringify(body),
      });

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
            // Visible page / OCR — not catalog-verified
            materialStatus = "source_page";
          } else {
            materialStatus = "ai_estimated";
          }
        }
        const patch = {
          title: capture.title || json.tagInfo?.productName || null,
          brand_name: capture.brand_name || json.tagInfo?.brand || null,
          composition_text: json.tagInfo?.composition || capture.composition_text,
          natural_fiber_percent: json.naturalPercent ?? capture.natural_fiber_percent,
          fiber_breakdown: json.fiberBreakdown || capture.fiber_breakdown,
          image_url: capture.image_url || json.tagInfo?.productImageUrl || null,
          material_status: materialStatus,
          material_confidence: json.tagInfo?.confidence || null,
          resolution_status: (json.betterAlternatives?.length
            ? "alternatives_ready"
            : "analyzed") as ResolutionStatus,
          alternatives: json.betterAlternatives || null,
          alternatives_ready_at: json.betterAlternatives?.length
            ? new Date().toISOString()
            : null,
          decoded_at: new Date().toISOString(),
        };

        const { data: updated } = await supabase
          .from("external_captures")
          .update(patch)
          .eq("id", captureId)
          .select("*")
          .single();

        await supabase.from("capture_events").insert({
          user_id: userId,
          capture_id: captureId,
          event_type: "decode_succeeded",
          metadata: { via: "api_scan", material_status: materialStatus },
        });

        return updated;
      }
    }

    // 3) Nothing resolved
    const { data: failed } = await supabase
      .from("external_captures")
      .update({
        resolution_status: "analyzed",
        material_status: capture.composition_text ? "source_page" : "unknown",
        decoded_at: new Date().toISOString(),
      })
      .eq("id", captureId)
      .select("*")
      .single();

    await supabase.from("capture_events").insert({
      user_id: userId,
      capture_id: captureId,
      event_type: "decode_succeeded",
      metadata: { via: "noop", note: "saved_without_match" },
    });

    return failed;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Decode failed";
    await supabase
      .from("external_captures")
      .update({
        resolution_status: "failed",
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
