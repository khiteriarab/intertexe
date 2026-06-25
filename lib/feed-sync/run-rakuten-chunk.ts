import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CHUNK_STATE_KEY = "rakuten_feed_chunk_state";
const DEFAULT_FILE_LIMIT = Number(process.env.RAKUTEN_CHUNK_FILE_LIMIT || 5);

export type RakutenChunkResult = {
  ok: boolean;
  fileOffset: number;
  nextFileOffset: number;
  fileLimit: number;
  cycleComplete: boolean;
  sync: {
    upserted?: number;
    filesProcessed?: number;
    totalCatalogFiles?: number;
    stockStatusBackfilled?: number;
    errors: number;
  };
  error?: string;
  markInactiveError?: string;
};

export async function runRakutenFeedChunk(
  supabase: SupabaseClient
): Promise<RakutenChunkResult> {
  let fileOffset = 0;
  try {
    const { data } = await supabase
      .from("system_status")
      .select("value_json")
      .eq("key", CHUNK_STATE_KEY)
      .maybeSingle();
    fileOffset = Number(data?.value_json?.nextFileOffset ?? 0);
  } catch {
    fileOffset = 0;
  }

  const fileLimit = DEFAULT_FILE_LIMIT;
  const { syncRakutenFeeds } = await import("./rakuten-sync.js");

  let syncResult: Awaited<ReturnType<typeof syncRakutenFeeds>>;
  try {
    syncResult = await syncRakutenFeeds({
      fileOffset,
      fileLimit,
      markInactive: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      fileOffset,
      nextFileOffset: fileOffset,
      fileLimit,
      cycleComplete: false,
      sync: { errors: 1 },
      error: message,
    };
  }

  const totalFiles = Number(syncResult.totalCatalogFiles ?? 0);
  const processed = Number(syncResult.filesProcessed ?? fileLimit);
  const nextOffset =
    totalFiles > 0 && fileOffset + processed >= totalFiles ? 0 : fileOffset + processed;
  const cycleComplete = totalFiles > 0 && nextOffset === 0 && fileOffset > 0;

  let markInactiveError: string | undefined;
  if (cycleComplete) {
    try {
      await syncRakutenFeeds({ fileOffset: 0, fileLimit: 1, markInactive: true });
    } catch (err: unknown) {
      markInactiveError = err instanceof Error ? err.message : String(err);
    }
  }

  try {
    await supabase.from("system_status").upsert({
      key: CHUNK_STATE_KEY,
      value_json: {
        nextFileOffset: nextOffset,
        lastFileOffset: fileOffset,
        filesProcessed: processed,
        totalCatalogFiles: totalFiles,
        cycleComplete,
        upserted: syncResult.upserted,
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
    await supabase.from("system_status").upsert({
      key: "catalog_feed_revision",
      value_json: { revision: new Date().toISOString(), source: "rakuten-feed-chunk" },
      updated_at: new Date().toISOString(),
    });
    await supabase.from("system_status").upsert({
      key: "rakuten_feed_sync",
      value_json: {
        ...(syncResult.stats || {}),
        fileOffset,
        nextFileOffset: nextOffset,
        filesProcessed: processed,
        totalCatalogFiles: totalFiles,
        stockStatusBackfilled: syncResult.stockStatusBackfilled,
        upserted: syncResult.upserted,
      },
      updated_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal
  }

  return {
    ok: true,
    fileOffset,
    nextFileOffset: nextOffset,
    fileLimit,
    cycleComplete,
    markInactiveError,
    sync: {
      upserted: syncResult.upserted,
      filesProcessed: syncResult.filesProcessed,
      totalCatalogFiles: syncResult.totalCatalogFiles,
      stockStatusBackfilled: syncResult.stockStatusBackfilled,
      errors: syncResult.errors?.length ?? 0,
    },
  };
}

export function getChunkSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}
