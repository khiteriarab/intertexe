import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_IMAGE_BYTES = 1024 * 1024; // 1MB after client compression

/**
 * POST /api/scan-history/capture
 * Persist the photographed scan frame to Supabase Storage (service role)
 * and attach durable URLs onto scan_history for the signed-in user.
 *
 * Body: { scanId: string, imageBase64: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getSupabaseAuthUserId(token);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = getServerSupabase();
    if (!service) {
      return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    }

    const body = (await req.json()) as {
      scanId?: string;
      imageBase64?: string;
      productImageUrl?: string | null;
    };

    const scanId = String(body.scanId || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "");
    if (!scanId) {
      return NextResponse.json({ error: "scanId required" }, { status: 400 });
    }

    const raw = String(body.imageBase64 || "");
    const base64 = raw.includes(",") ? raw.split(",")[1] || "" : raw;
    if (!base64) {
      return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
    }

    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image must be under 1MB" }, { status: 400 });
    }

    const path = `${userId.toLowerCase()}/${scanId}.jpg`;
    const { error: uploadError } = await service.storage
      .from("scan-captures")
      .upload(path, buffer, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "604800",
      });
    if (uploadError) {
      console.error("[scan-history/capture] upload", uploadError.message);
      return NextResponse.json({ error: "Upload failed" }, { status: 502 });
    }

    const { data: publicData } = service.storage.from("scan-captures").getPublicUrl(path);
    const captureImageUrl = publicData?.publicUrl;
    if (!captureImageUrl) {
      return NextResponse.json({ error: "Could not resolve public URL" }, { status: 502 });
    }

    const productImageUrl = String(body.productImageUrl || "").trim();
    const primaryImageUrl = /^https?:\/\//i.test(productImageUrl)
      ? productImageUrl
      : captureImageUrl;

    // Best-effort attach to scan_history (column may be missing pre-migration).
    const { data: existing } = await service
      .from("scan_history")
      .select("id, raw_analysis")
      .eq("id", scanId)
      .eq("user_id", userId.toLowerCase())
      .maybeSingle();

    if (existing?.id) {
      const rawAnalysis =
        existing.raw_analysis && typeof existing.raw_analysis === "object"
          ? { ...(existing.raw_analysis as Record<string, unknown>) }
          : {};
      rawAnalysis.capture_image_url = captureImageUrl;

      const withColumn = {
        image_url: primaryImageUrl,
        capture_image_url: captureImageUrl,
        raw_analysis: rawAnalysis,
      };
      let { error: updateError } = await service
        .from("scan_history")
        .update(withColumn)
        .eq("id", scanId)
        .eq("user_id", userId.toLowerCase());

      if (updateError && /capture_image_url/i.test(updateError.message || "")) {
        ({ error: updateError } = await service
          .from("scan_history")
          .update({ image_url: primaryImageUrl, raw_analysis: rawAnalysis })
          .eq("id", scanId)
          .eq("user_id", userId.toLowerCase()));
      }

      if (updateError) {
        console.warn("[scan-history/capture] row update skipped:", updateError.message);
      }
    }

    return NextResponse.json({
      captureImageUrl,
      imageUrl: primaryImageUrl,
      storagePath: path,
    });
  } catch (err: any) {
    console.error("[scan-history/capture]", err?.message || err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
