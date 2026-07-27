#!/usr/bin/env node
/**
 * Supervise Rakuten feed catch-up until checkpoint completes a cycle (or reaches total).
 *
 * - Polls GitHub Actions Rakuten Feed Sync
 * - Redispatches from last checkpoint on failure/cancel (never resets to 0 unless listing failed)
 * - Uses small file_limit (default 1) for memory safety
 * - Prints milestone reports at 25/50/75/100% of files
 *
 *   GITHUB_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/supervise-feed-catchup.mjs
 *
 * Optional:
 *   RAKUTEN_CHUNK_FILE_LIMIT=1
 *   CATCHUP_POLL_SECONDS=60
 *   CATCHUP_MAX_HOURS=18
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const WORKFLOW_ID = 320291642;
const REPO = "khiteriarab/intertexe";
const FILE_LIMIT = String(process.env.RAKUTEN_CHUNK_FILE_LIMIT || "1");
const POLL_MS = Number(process.env.CATCHUP_POLL_SECONDS || 60) * 1000;
const MAX_MS = Number(process.env.CATCHUP_MAX_HOURS || 18) * 3600 * 1000;
const MILESTONES = [25, 50, 75, 100];

function loadEnv() {
  for (const f of [
    path.join(root, "../.env"),
    path.join(root, ".env.vercel.local"),
    path.join(root, ".env.local"),
  ]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
  .replace(/^"|"$/g, "")
  .replace(/\/$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^"|"$/g, "");
let ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

async function resolveGhToken() {
  if (ghToken) return ghToken;
  // fall back: git credential fill
  const { spawnSync } = await import("child_process");
  const r = spawnSync(
    "bash",
    ["-lc", `printf 'protocol=https\\nhost=github.com\\n\\n' | git credential fill`],
    { encoding: "utf8" }
  );
  const line = (r.stdout || "").split("\n").find((l) => l.startsWith("password="));
  if (line) ghToken = line.slice("password=".length).trim();
  return ghToken;
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function gh(pathname, init = {}) {
  const token = await resolveGhToken();
  if (!token) throw new Error("GITHUB_TOKEN required");
  const res = await fetch(`https://api.github.com/repos/${REPO}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`GitHub ${res.status} ${pathname}: ${text.slice(0, 400)}`);
  return data;
}

async function getCheckpoint() {
  const { data } = await sb
    .from("system_status")
    .select("value_json,updated_at")
    .eq("key", "rakuten_feed_chunk_state")
    .maybeSingle();
  const v = data?.value_json || {};
  return {
    offset: Number(v.nextFileOffset ?? 0),
    total: Number(v.totalCatalogFiles ?? 165),
    cycleComplete: Boolean(v.cycleComplete),
    lastUpserted: v.upserted,
    updatedAt: data?.updated_at,
    raw: v,
  };
}

async function catalogPulse() {
  // Prefer cheap system_status + RPC sample over full table counts (timeout-prone).
  const [{ data: lkg }, { data: sync }, { data: lock }, browse] = await Promise.all([
    sb.from("system_status").select("value_json").eq("key", "catalog_last_known_good").maybeSingle(),
    sb.from("system_status").select("value_json").eq("key", "rakuten_feed_sync").maybeSingle(),
    sb.from("system_status").select("value_json").eq("key", "rakuten_feed_sync_lock").maybeSingle(),
    sb.rpc("catalog_browse_page_v2", {
      p_region: "us",
      p_category: "clothing",
      p_material_family: null,
      p_material_subtype: null,
      p_fabric_construction: null,
      p_min_nfp: null,
      p_max_synthetic: null,
      p_color: null,
      p_brand_slug: null,
      p_search: null,
      p_min_price: null,
      p_max_price: null,
      p_include_unverified: false,
      p_sort: "newest",
      p_limit: 40,
      p_offset: 0,
    }),
  ]);
  const products = browse.data?.products || [];
  const brands = [...new Set(products.map((p) => p.brand_name || p.brand_slug).filter(Boolean))];
  const blank = products.filter((p) => !String(p.composition || "").trim()).length;
  const noImage = products.filter((p) => !String(p.image_url || p.imageURL || "").trim()).length;
  return {
    lkg: lkg?.value_json || null,
    lastSync: sync?.value_json || null,
    lock: lock?.value_json || null,
    clothingSample: {
      n: products.length,
      brands: brands.length,
      brandNames: brands.slice(0, 15),
      blankComposition: blank,
      missingImage: noImage,
      path: browse.data?.debug?.path_mode,
    },
    browseError: browse.error?.message || null,
  };
}

function pct(offset, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((100 * offset) / total));
}

async function latestRuns(n = 3) {
  const data = await gh(`/actions/workflows/${WORKFLOW_ID}/runs?per_page=${n}`);
  return data.workflow_runs || [];
}

async function dispatchCatchup() {
  await gh(`/actions/workflows/${WORKFLOW_ID}/dispatches`, {
    method: "POST",
    body: JSON.stringify({
      ref: "main",
      inputs: { file_limit: FILE_LIMIT, ftp_dir_filter: "" },
    }),
  });
  console.log(`[dispatch] file_limit=${FILE_LIMIT} at ${new Date().toISOString()}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const reported = new Set();

async function maybeMilestone(cp) {
  const p = pct(cp.offset, cp.total);
  for (const m of MILESTONES) {
    if (p >= m && !reported.has(m)) {
      reported.add(m);
      const pulse = await catalogPulse();
      console.log(
        JSON.stringify(
          {
            milestone: `${m}%`,
            checkpoint: `${cp.offset}/${cp.total}`,
            eta_note:
              m < 100
                ? `~${Math.max(1, Math.ceil(((cp.total - cp.offset) / Number(FILE_LIMIT)) * 0.35))}h remaining at ~${FILE_LIMIT} file(s)/~20-40m chunk`
                : "files complete — run customer-facing QA",
            pulse,
            at: new Date().toISOString(),
          },
          null,
          2
        )
      );
    }
  }
}

async function main() {
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  await resolveGhToken();
  const started = Date.now();
  console.log(
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        fileLimit: FILE_LIMIT,
        pollSeconds: POLL_MS / 1000,
        maxHours: MAX_MS / 3600000,
      },
      null,
      2
    )
  );

  let cp = await getCheckpoint();
  console.log("[start]", cp);
  await maybeMilestone(cp);

  // Ensure a run is in flight
  let runs = await latestRuns(5);
  let active = runs.find((r) => r.status === "in_progress" || r.status === "queued");
  if (!active) {
    await dispatchCatchup();
    await sleep(8000);
    runs = await latestRuns(3);
    active = runs.find((r) => r.status === "in_progress" || r.status === "queued") || runs[0];
  }
  console.log("[watching]", active?.id, active?.html_url, active?.status);

  while (Date.now() - started < MAX_MS) {
    cp = await getCheckpoint();
    await maybeMilestone(cp);

    if (cp.cycleComplete || (cp.total > 0 && cp.offset === 0 && cp.raw?.source?.includes("gha_"))) {
      // cycleComplete true OR wrapped to 0 after finishing — only treat wrap as done if last offset was high
      // Safer: done when offset >= total OR cycleComplete
    }
    if (cp.cycleComplete || (cp.total > 0 && cp.offset >= cp.total)) {
      console.log("[done] catch-up files complete", cp);
      break;
    }
    // Progress toward wrap: nextOffset resets to 0 when finished; detect via lastFileOffset near end
    if (
      cp.offset === 0 &&
      Number(cp.raw?.lastFileOffset ?? 0) >= Math.max(1, cp.total - Number(FILE_LIMIT))
    ) {
      console.log("[done] checkpoint wrapped after final files", cp);
      break;
    }

    runs = await latestRuns(5);
    active = runs.find((r) => r.status === "in_progress" || r.status === "queued");
    const latest = runs[0];

    if (active) {
      console.log(
        `[progress] checkpoint ${cp.offset}/${cp.total} (${pct(cp.offset, cp.total)}%) run=${active.id} status=${active.status}`
      );
      await sleep(POLL_MS);
      continue;
    }

    // No active run — inspect latest conclusion
    if (!latest) {
      await dispatchCatchup();
      await sleep(POLL_MS);
      continue;
    }

    console.log(
      `[idle] latest=${latest.id} conclusion=${latest.conclusion} checkpoint=${cp.offset}/${cp.total}`
    );

    if (latest.conclusion === "success") {
      // Continue until files done
      if (cp.cycleComplete || cp.offset >= cp.total) break;
      await dispatchCatchup();
      await sleep(15000);
      continue;
    }

    // failure / cancelled / timed_out — restart from last successful checkpoint (do not reset)
    console.error(
      `[restart] run ${latest.id} ${latest.conclusion}; resuming from checkpoint ${cp.offset}/${cp.total}`
    );
    await dispatchCatchup();
    await sleep(20000);
  }

  const finalCp = await getCheckpoint();
  const pulse = await catalogPulse();
  console.log(
    JSON.stringify(
      { finishedAt: new Date().toISOString(), checkpoint: finalCp, pulse },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
