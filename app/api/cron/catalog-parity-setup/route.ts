export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyCatalogMigration } from "../../../../lib/apply-catalog-migration";
import { refreshCollectionMemberships } from "../../../../lib/collection-memberships";

function authorize(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Apply migration, refresh memberships, return parity snapshot. */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const skipMigration = new URL(request.url).searchParams.get("skipMigration") === "1";
  const log: Record<string, unknown> = { at: new Date().toISOString() };

  try {
    if (!skipMigration) {
      log.migration = await applyCatalogMigration();
    } else {
      log.migration = { skipped: true };
    }

    log.memberships = await refreshCollectionMemberships();

    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const { data: saleCount, error: saleErr } = await supabase.rpc("sale_catalog_count", {
      p_fiber: null,
      p_max_price: null,
    });
    log.saleCount = saleErr ? `err:${saleErr.message}` : Number(saleCount ?? 0);

    const collections: Record<string, number> = {};
    for (const slug of [
      "vacation",
      "evening",
      "tailoring",
      "summer-in-the-city",
      "white-edit",
    ] as const) {
      const { data: c, error } = await supabase.rpc("collection_catalog_count", { p_slug: slug });
      collections[slug] = error ? -1 : Number(c ?? 0);
    }
    log.collections = collections;

    const rails: Record<string, number> = {};
    for (const slug of [
      "vacation",
      "evening",
      "tailoring",
      "summer-in-the-city",
      "white-edit",
    ]) {
      const { count } = await supabase
        .from("homepage_feed_items")
        .select("rail_key", { count: "exact", head: true })
        .eq("rail_key", `collections:${slug}`);
      rails[slug] = count ?? 0;
    }
    log.homepageRails = rails;

    return NextResponse.json({ ok: true, ...log });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, ...log }, { status: 500 });
  }
}
