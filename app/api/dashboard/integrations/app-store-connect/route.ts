import { NextRequest, NextResponse } from "next/server";
import { requireHqSession } from "../../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../../lib/supabase-service-client";
import { upsertConnection, syncProvider } from "../../../../../lib/dashboard/integrations/connections";
import { appStoreKeyBundle } from "../../../../../lib/dashboard/integrations/providers/app-store-connect";

export const dynamic = "force-dynamic";

/**
 * App Store Connect has no user OAuth — upload team API key once.
 * Body JSON: { keyId, issuerId, privateKeyPem, vendorNumber?, bundleId?, accountLabel? }
 * Or multipart with file field `p8`.
 */
export async function POST(request: NextRequest) {
  const session = await requireHqSession();
  if (!session.roles.some((r) => ["founder", "admin"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const contentType = request.headers.get("content-type") || "";
  let keyId = "";
  let issuerId = "";
  let privateKeyPem = "";
  let accountLabel = "";
  let vendorNumber = "";
  let bundleId = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    keyId = String(form.get("keyId") || "").trim();
    issuerId = String(form.get("issuerId") || "").trim();
    accountLabel = String(form.get("accountLabel") || "").trim();
    vendorNumber = String(form.get("vendorNumber") || "").trim();
    bundleId = String(form.get("bundleId") || "").trim();
    const file = form.get("p8");
    if (file && typeof file === "object" && "text" in file) {
      privateKeyPem = await (file as File).text();
    } else {
      privateKeyPem = String(form.get("privateKeyPem") || "");
    }
  } else {
    const body = await request.json();
    keyId = String(body.keyId || "").trim();
    issuerId = String(body.issuerId || "").trim();
    privateKeyPem = String(body.privateKeyPem || "");
    accountLabel = String(body.accountLabel || "").trim();
    vendorNumber = String(body.vendorNumber || "").trim();
    bundleId = String(body.bundleId || "").trim();
  }

  if (!keyId || !issuerId || !privateKeyPem.includes("PRIVATE KEY")) {
    return NextResponse.json(
      { message: "keyId, issuerId, and a valid .p8 private key PEM are required." },
      { status: 400 }
    );
  }

  const bundle = appStoreKeyBundle({
    keyId,
    issuerId,
    privateKeyPem,
    vendorNumber: vendorNumber || undefined,
    bundleId: bundleId || undefined,
    accountLabel: accountLabel || undefined,
  });
  await upsertConnection(supabase, {
    workspaceId: session.workspaceId,
    provider: "app_store_connect",
    bundle,
    connectedByInternalUserId: session.internalUserId,
  });
  const sync = await syncProvider(supabase, session.workspaceId, "app_store_connect");
  return NextResponse.json({ ok: true, sync });
}
