#!/usr/bin/env node
/**
 * Client-side id-walk NFP repair — avoids PostgREST timeouts on heavy SQL functions.
 *
 * Usage: node --import tsx scripts/run-nfp-backfill.ts [scanLimit] [maxPages]
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseCompositionText } from "../lib/material-intelligence/composition.ts";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const root = process.cwd();
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env.development.local"));
loadEnvFile(path.join(root, "../.env"));

import { assertCatalogBulkMutationsAllowed } from "./lib/catalog-bulk-guard.mjs";
assertCatalogBulkMutationsAllowed();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const scanLimit = Number(process.argv[2] || 400);
const maxPages = Number(process.argv[3] || 500);
const cursorFile = path.join(root, "scripts/nfp-backfill.cursor.json");

if (!url || !key) {
  console.error("Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);

function derivedNfp(
  composition: string | null,
  materialMetadata: unknown,
  stored: number | null
): number {
  const breakdown =
    materialMetadata &&
    typeof materialMetadata === "object" &&
    Array.isArray((materialMetadata as { breakdown?: unknown }).breakdown)
      ? ((materialMetadata as { breakdown: Array<{ fiber?: string; name?: string; percent?: number; percentage?: number }> }).breakdown)
      : null;
  const parsed = parseCompositionText(composition, breakdown);
  if (parsed.natural_fiber_percentage != null && Number.isFinite(parsed.natural_fiber_percentage)) {
    return Math.min(100, Math.max(0, Math.round(parsed.natural_fiber_percentage)));
  }
  if (stored != null && Number.isFinite(stored)) {
    return Math.min(100, Math.max(0, Math.round(stored)));
  }
  return 0;
}

function isMismatch(stored: number | null, derived: number): boolean {
  const s = stored == null ? null : Math.round(stored);
  if (s !== derived) return true;
  if ((s ?? 0) >= 70 && derived < 70) return true;
  return false;
}

function readCursor(): string {
  try {
    const raw = JSON.parse(fs.readFileSync(cursorFile, "utf8")) as { afterId?: string };
    return raw.afterId || "00000000-0000-0000-0000-000000000000";
  } catch {
    return "00000000-0000-0000-0000-000000000000";
  }
}

function writeCursor(afterId: string, totalFixed: number) {
  fs.writeFileSync(cursorFile, JSON.stringify({ afterId, totalFixed, updatedAt: new Date().toISOString() }, null, 2));
}

async function main() {
  let afterId = readCursor();
  let totalFixed = 0;
  let pages = 0;

  console.log(`NFP client backfill scanLimit=${scanLimit} maxPages=${maxPages} startAfter=${afterId.slice(0, 8)}…`);

  while (pages < maxPages) {
    pages += 1;
    const { data, error } = await sb
      .from("products")
      .select("id, composition, material_metadata, natural_fiber_percent, is_displayable")
      .gt("id", afterId)
      .not("composition", "is", null)
      .neq("composition", "")
      .order("id", { ascending: true })
      .limit(scanLimit);

    if (error) throw error;
    if (!data?.length) {
      console.log(`DONE scanned to end totalFixed=${totalFixed}`);
      writeCursor("00000000-0000-0000-0000-000000000000", totalFixed);
      return;
    }

    const updates: { id: string; natural_fiber_percent: number; is_displayable: boolean }[] = [];
    for (const row of data) {
      const stored = row.natural_fiber_percent as number | null;
      const derived = derivedNfp(
        row.composition as string | null,
        row.material_metadata,
        stored
      );
      if (!isMismatch(stored, derived)) continue;
      updates.push({
        id: row.id as string,
        natural_fiber_percent: derived,
        is_displayable: derived >= 80 ? Boolean(row.is_displayable ?? true) : false,
      });
    }

    let pageFixed = 0;
    for (let i = 0; i < updates.length; i += 50) {
      const chunk = updates.slice(i, i + 50);
      for (const row of chunk) {
        const { error: upErr } = await sb
          .from("products")
          .update({ composition: row.composition as string })
          .eq("id", row.id);
        if (upErr) throw upErr;
        pageFixed += 1;
      }
    }

    totalFixed += pageFixed;
    afterId = data[data.length - 1].id as string;
    writeCursor(afterId, totalFixed);
    console.log(
      `page ${pages}: scanned=${data.length} fixed=${pageFixed} totalFixed=${totalFixed} cursor=${afterId.slice(0, 8)}…`
    );

    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`STOP (max pages) totalFixed=${totalFixed} resumeAfter=${afterId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
