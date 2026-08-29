#!/usr/bin/env node
/**
 * Distinct-card review queue — primary QA artifact for manual reviewer sign-off.
 *
 * - Leaf / combined route: 50 distinct cards from browse RPC (<50 → full catalog).
 * - Parent nodes with direct assignments: additional 50-card sample from direct parent slug only.
 * - Global dedupe: each physical card reviewed once; all evaluating nodes preserved on item.
 *
 * Output:
 *   scripts/taxonomy-card-review-report.json
 *   scripts/taxonomy-card-review.html  (local review UI — open in browser)
 *
 * Usage: node --env-file=.env.development.local scripts/taxonomy-card-review.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REGION = "us";
const SAMPLE_CAP = 50;

/** Parent nodes that may hold direct primary assignments (separate sample). */
const PARENT_DIRECT_SLUGS = new Set([
  "clothing/tops",
  "shoes/flat-shoes",
  "shoes/heels",
  "shoes/boots",
]);

if (!url || !key) {
  console.error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function cardKey(p) {
  return String(p.canonical_id ?? p.product_id ?? p.id ?? "");
}

async function browsePage(dept, slug, offset, limit) {
  const rpc =
    dept === "shoes" ? "catalog_footwear_taxonomy_browse_page" : "catalog_taxonomy_browse_page";
  const base =
    dept === "shoes"
      ? {
          p_region: REGION,
          p_taxonomy_slug: slug,
          p_color: null,
          p_brand_slug: null,
          p_search: null,
          p_min_price: null,
          p_max_price: null,
          p_sort: "newest",
          p_limit: limit,
          p_offset: offset,
        }
      : {
          p_region: REGION,
          p_taxonomy_slug: slug,
          p_material_family: null,
          p_material_subtype: null,
          p_fabric_construction: null,
          p_min_nfp: null,
          p_color: null,
          p_brand_slug: null,
          p_search: null,
          p_min_price: null,
          p_max_price: null,
          p_sort: "newest",
          p_limit: limit,
          p_offset: offset,
        };
  const { data, error } = await sb.rpc(rpc, base);
  if (error) throw new Error(`${slug}@${offset}: ${error.message}`);
  return data;
}

async function collectDistinctFromBrowse(dept, slug, uniqueTotal, excludeKeys = new Set()) {
  const reviewAll = uniqueTotal < SAMPLE_CAP;
  const target = reviewAll ? uniqueTotal : SAMPLE_CAP;
  const seen = new Map();
  let offset = 0;
  const pageSize = 100;

  while (seen.size < target) {
    const page = await browsePage(dept, slug, offset, pageSize);
    const products = page?.products ?? [];
    if (products.length === 0) break;

    for (const p of products) {
      const key = cardKey(p);
      if (!key || seen.has(key) || excludeKeys.has(key)) continue;
      seen.set(key, p);
      if (!reviewAll && seen.size >= SAMPLE_CAP) break;
    }

    if (!page.has_more || products.length < pageSize) break;
    offset += pageSize;
    if (offset > uniqueTotal + pageSize * 5) break;
  }

  return {
    cards: [...seen.values()],
    reviewMode: reviewAll ? "full_catalog_under_50" : `distinct_${SAMPLE_CAP}`,
    targetCount: target,
  };
}

async function collectDirectParentAssignments(dept, parentSlug, excludeKeys = new Set()) {
  const table = dept === "shoes" ? "live_products_footwear" : "live_products_apparel";

  const { data: assignments } = await sb
    .from("product_taxonomy_assignments")
    .select("offer_id")
    .eq("taxonomy_version", "retail-v1")
    .eq("is_primary", true)
    .eq("taxonomy_slug", parentSlug);

  const pool = (assignments ?? []).map((a) => a.offer_id);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const seen = new Map();

  for (let i = 0; i < shuffled.length && seen.size < SAMPLE_CAP; i += 80) {
    const chunk = shuffled.slice(i, i + 80);
    const { data: rows } = await sb
      .from(table)
      .select("id, name, category, garment_type, image_url, product_id, composition, brand_name")
      .eq("region", REGION)
      .in("id", chunk);

    for (const row of rows ?? []) {
      const key = cardKey(row);
      if (!key || seen.has(key) || excludeKeys.has(key)) continue;
      if (seen.size >= SAMPLE_CAP) break;
      seen.set(key, row);
    }
  }

  const directTotal = pool.length;
  const reviewAll = directTotal < SAMPLE_CAP;

  return {
    cards: [...seen.values()],
    directAssignmentPool: directTotal,
    reviewMode: reviewAll ? "full_direct_parent_under_50" : `direct_parent_${SAMPLE_CAP}`,
    targetCount: reviewAll ? directTotal : SAMPLE_CAP,
  };
}

async function enrichAssignments(offerIds) {
  if (!offerIds.length) return {};
  const { data } = await sb
    .from("product_taxonomy_assignments")
    .select("offer_id, taxonomy_slug, source, confidence")
    .eq("taxonomy_version", "retail-v1")
    .eq("is_primary", true)
    .in("offer_id", offerIds);
  return Object.fromEntries((data ?? []).map((a) => [a.offer_id, a]));
}

function buildReviewItem(product, assignment) {
  return {
    reviewId: cardKey(product),
    offerId: product.id,
    cardKey: cardKey(product),
    imageUrl: product.image_url ?? product.imageUrl ?? null,
    title: product.name ?? "",
    retailerCategory: product.category ?? null,
    garmentType: product.garment_type ?? product.garmentType ?? null,
    assignmentSource: assignment?.source ?? null,
    assignedNode: assignment?.taxonomy_slug ?? null,
    assignmentConfidence: assignment?.confidence ?? null,
    reviewerDecision: "pending",
    reviewerNotes: null,
    evaluations: [],
  };
}

/** Global deduped queue — same card once, multiple node evaluations attached. */
class ReviewQueue {
  constructor() {
    this.byCardKey = new Map();
  }

  add(product, assignment, evaluation) {
    const key = cardKey(product);
    let item = this.byCardKey.get(key);
    if (!item) {
      item = buildReviewItem(product, assignment);
      this.byCardKey.set(key, item);
    }
    const dup = item.evaluations.some(
      (e) => e.nodeSlug === evaluation.nodeSlug && e.sampleKind === evaluation.sampleKind
    );
    if (!dup) item.evaluations.push(evaluation);
    return item.reviewId;
  }

  all() {
    return [...this.byCardKey.values()];
  }
}

async function sampleNode(node, queue) {
  const dept = node.department;
  const slug = node.slug;
  const samples = [];

  const first = await browsePage(dept, slug, 0, 1);
  const uniqueTotal = Number(first?.total) || 0;

  const combined = await collectDistinctFromBrowse(dept, slug, uniqueTotal);
  const combinedAssigns = await enrichAssignments(combined.cards.map((c) => c.id));
  const combinedReviewIds = [];
  for (const p of combined.cards) {
    const id = queue.add(p, combinedAssigns[p.id], {
      nodeSlug: slug,
      nodeLabel: node.label,
      sampleKind: PARENT_DIRECT_SLUGS.has(slug) ? "combined_route" : "leaf",
    });
    combinedReviewIds.push(id);
  }
  samples.push({
    sampleKind: PARENT_DIRECT_SLUGS.has(slug) ? "combined_route" : "leaf",
    uniqueCardCount: uniqueTotal,
    reviewMode: combined.reviewMode,
    targetSampleSize: combined.targetCount,
    sampledCount: combined.cards.length,
    reviewIds: combinedReviewIds,
  });

  if (PARENT_DIRECT_SLUGS.has(slug)) {
    const direct = await collectDirectParentAssignments(dept, slug);
    const directAssigns = await enrichAssignments(direct.cards.map((c) => c.id));
    const directReviewIds = [];
    for (const p of direct.cards) {
      const id = queue.add(p, directAssigns[p.id], {
        nodeSlug: slug,
        nodeLabel: node.label,
        sampleKind: "direct_parent",
      });
      directReviewIds.push(id);
    }
    samples.push({
      sampleKind: "direct_parent",
      uniqueCardCount: direct.directAssignmentPool,
      reviewMode: direct.reviewMode,
      targetSampleSize: direct.targetCount,
      sampledCount: direct.cards.length,
      reviewIds: directReviewIds,
    });
  }

  return {
    slug,
    label: node.label,
    uniqueCardCount: uniqueTotal,
    samples,
  };
}

function renderReviewUi(report) {
  const embedded = JSON.stringify(report).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Taxonomy card review</title>
  <style>
    :root { --bg:#fafaf8; --fg:#111; --muted:#666; --border:#ddd; --ok:#1a6b3c; --bad:#9b1c1c; --unsure:#9a6b00; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; background: var(--bg); color: var(--fg); }
    header { position: sticky; top: 0; z-index: 10; background: var(--bg); border-bottom: 1px solid var(--border); padding: 12px 16px; }
    header h1 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
    .meta { font-size: 12px; color: var(--muted); }
    .progress-wrap { margin-top: 10px; height: 8px; background: #e8e8e4; border-radius: 4px; overflow: hidden; }
    .progress-bar { height: 100%; background: var(--ok); width: 0%; transition: width 0.2s; }
    .progress-label { font-size: 12px; margin-top: 4px; }
    .layout { display: grid; grid-template-columns: 240px 1fr; min-height: calc(100vh - 80px); }
    aside { border-right: 1px solid var(--border); padding: 12px; font-size: 12px; overflow-y: auto; }
    aside h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 12px 0 6px; }
    aside button { display: block; width: 100%; text-align: left; padding: 6px 8px; margin-bottom: 4px; border: 1px solid var(--border); background: #fff; cursor: pointer; font-size: 12px; }
    aside button.active { background: #111; color: #fff; border-color: #111; }
    .node-row { padding: 4px 0; border-bottom: 1px solid #eee; }
    main { padding: 16px; max-width: 720px; }
    .card { display: grid; grid-template-columns: 140px 1fr; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border); }
    .card img { width: 140px; height: 186px; object-fit: cover; background: #eee; }
    .card h3 { margin: 0 0 8px; font-size: 15px; line-height: 1.35; }
    dl { display: grid; grid-template-columns: 130px 1fr; gap: 4px 10px; margin: 0 0 12px; font-size: 12px; }
    dt { color: var(--muted); margin: 0; } dd { margin: 0; }
    .eval-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
    .tag { font-size: 10px; padding: 2px 6px; background: #eee; border-radius: 2px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .actions button { padding: 10px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; border: 1px solid var(--border); cursor: pointer; background: #fff; }
    .actions button[data-v="correct"].sel { background: var(--ok); color: #fff; border-color: var(--ok); }
    .actions button[data-v="incorrect"].sel { background: var(--bad); color: #fff; border-color: var(--bad); }
    .actions button[data-v="unsure"].sel { background: var(--unsure); color: #fff; border-color: var(--unsure); }
    .toolbar { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .toolbar button { padding: 8px 12px; font-size: 12px; border: 1px solid var(--border); background: #fff; cursor: pointer; }
    .nav-row { display: flex; gap: 8px; margin-top: 16px; }
    .empty { color: var(--muted); padding: 24px; }
    textarea.notes { width: 100%; margin-top: 8px; font-size: 12px; padding: 8px; min-height: 56px; }
  </style>
</head>
<body>
  <header>
    <h1>Taxonomy card review</h1>
    <div class="meta">Distinct cards deduped across nodes · decisions saved locally</div>
    <div class="progress-wrap"><div class="progress-bar" id="progressBar"></div></div>
    <div class="progress-label" id="progressLabel">0 / 0 reviewed</div>
    <div class="toolbar">
      <button type="button" id="exportBtn">Export completed JSON</button>
      <button type="button" id="resetBtn">Reset local progress</button>
    </div>
  </header>
  <div class="layout">
    <aside id="sidebar"></aside>
    <main id="main"><p class="empty">Loading…</p></main>
  </div>
  <script>
    window.__REVIEW_REPORT__ = ${embedded};
    const STORAGE_KEY = "taxonomy-card-review-progress-v1";
    let report = window.__REVIEW_REPORT__;
    let filter = { node: "all", status: "all" };
    let index = 0;

    function loadProgress() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        for (const item of report.reviewQueue) {
          const s = saved[item.reviewId];
          if (!s) continue;
          item.reviewerDecision = s.reviewerDecision ?? item.reviewerDecision;
          item.reviewerNotes = s.reviewerNotes ?? item.reviewerNotes;
        }
      } catch (e) { console.warn(e); }
    }

    function saveProgress() {
      const out = {};
      for (const item of report.reviewQueue) {
        out[item.reviewId] = {
          reviewerDecision: item.reviewerDecision,
          reviewerNotes: item.reviewerNotes,
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    }

    function reviewedCount() {
      return report.reviewQueue.filter((i) => i.reviewerDecision !== "pending").length;
    }

    function filteredItems() {
      return report.reviewQueue.filter((item) => {
        if (filter.status === "pending" && item.reviewerDecision !== "pending") return false;
        if (filter.status === "done" && item.reviewerDecision === "pending") return false;
        if (filter.node !== "all") {
          const match = item.evaluations.some((e) => e.nodeSlug === filter.node);
          if (!match) return false;
        }
        return true;
      });
    }

    function renderProgress() {
      const total = report.reviewQueue.length;
      const done = reviewedCount();
      document.getElementById("progressBar").style.width = total ? (100 * done / total) + "%" : "0%";
      document.getElementById("progressLabel").textContent = done + " / " + total + " unique cards reviewed";
    }

    function renderSidebar() {
      const el = document.getElementById("sidebar");
      let html = "<h2>Status</h2>";
      for (const f of [["all","All"],["pending","Pending"],["done","Reviewed"]]) {
        html += '<button type="button" data-filter-status="' + f[0] + '"' + (filter.status === f[0] ? ' class="active"' : '') + ">" + f[1] + "</button>";
      }
      html += "<h2>Nodes</h2>";
      html += '<button type="button" data-filter-node="all"' + (filter.node === "all" ? ' class="active"' : '') + ">All nodes</button>";
      for (const n of report.nodeSummaries) {
        const done = n.samples.reduce((s, samp) => s + samp.reviewIds.filter((id) => {
          const item = report.reviewQueue.find((q) => q.reviewId === id);
          return item && item.reviewerDecision !== "pending";
        }).length, 0);
        const total = n.samples.reduce((s, samp) => s + samp.reviewIds.length, 0);
        html += '<button type="button" data-filter-node="' + n.slug + '"' + (filter.node === n.slug ? ' class="active"' : '') + ">" + n.label + " (" + done + "/" + total + ")</button>";
      }
      el.innerHTML = html;
      el.querySelectorAll("[data-filter-status]").forEach((btn) => {
        btn.onclick = () => { filter.status = btn.dataset.filterStatus; index = 0; render(); };
      });
      el.querySelectorAll("[data-filter-node]").forEach((btn) => {
        btn.onclick = () => { filter.node = btn.dataset.filterNode; index = 0; render(); };
      });
    }

    function esc(s) {
      return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
    }

    function renderCard(item) {
      const tags = item.evaluations.map((e) =>
        '<span class="tag">' + esc(e.nodeLabel) + " · " + esc(e.sampleKind) + "</span>"
      ).join("");
      const dec = item.reviewerDecision;
      return '<article class="card">' +
        '<img src="' + esc(item.imageUrl) + '" alt="" />' +
        "<div>" +
        "<h3>" + esc(item.title) + "</h3>" +
        '<div class="eval-tags">' + tags + "</div>" +
        "<dl>" +
        "<dt>Retailer category</dt><dd>" + esc(item.retailerCategory || "—") + "</dd>" +
        "<dt>Garment type</dt><dd>" + esc(item.garmentType || "—") + "</dd>" +
        "<dt>Assignment source</dt><dd>" + esc(item.assignmentSource || "—") + "</dd>" +
        "<dt>Assigned node</dt><dd>" + esc(item.assignedNode || "—") + "</dd>" +
        "</dl>" +
        '<div class="actions">' +
        ['correct','incorrect','unsure'].map((v) =>
          '<button type="button" data-v="' + v + '"' + (dec === v ? ' class="sel"' : '') + ">" + v + "</button>"
        ).join("") +
        "</div>" +
        '<textarea class="notes" placeholder="Notes (optional)">' + esc(item.reviewerNotes || "") + "</textarea>" +
        "</div></article>";
    }

    function renderMain() {
      const items = filteredItems();
      const main = document.getElementById("main");
      if (!items.length) {
        main.innerHTML = '<p class="empty">No cards match this filter.</p>';
        return;
      }
      if (index >= items.length) index = items.length - 1;
      if (index < 0) index = 0;
      const item = items[index];
      main.innerHTML =
        renderCard(item) +
        '<div class="nav-row">' +
        '<button type="button" id="prevBtn"' + (index === 0 ? " disabled" : "") + ">Previous</button>" +
        "<span style=\\"line-height:32px;font-size:12px;color:#666\\">" + (index + 1) + " / " + items.length + " in filter</span>" +
        '<button type="button" id="nextBtn"' + (index >= items.length - 1 ? " disabled" : "") + ">Next</button>" +
        "</div>";

      main.querySelectorAll(".actions button").forEach((btn) => {
        btn.onclick = () => {
          item.reviewerDecision = btn.dataset.v;
          saveProgress();
          renderProgress();
          renderSidebar();
          main.querySelectorAll(".actions button").forEach((b) => b.classList.toggle("sel", b.dataset.v === item.reviewerDecision));
          if (index < items.length - 1) { index++; renderMain(); }
        };
      });
      const notes = main.querySelector(".notes");
      notes.onchange = () => { item.reviewerNotes = notes.value; saveProgress(); };

      document.getElementById("prevBtn").onclick = () => { index--; renderMain(); };
      document.getElementById("nextBtn").onclick = () => { index++; renderMain(); };
    }

    function render() {
      renderProgress();
      renderSidebar();
      renderMain();
    }

    document.getElementById("exportBtn").onclick = () => {
      const completed = {
        exportedAt: new Date().toISOString(),
        sourceGeneratedAt: report.generatedAt,
        reviewedCount: reviewedCount(),
        totalUniqueCards: report.reviewQueue.length,
        reviewQueue: report.reviewQueue,
        nodeSummaries: report.nodeSummaries,
      };
      const blob = new Blob([JSON.stringify(completed, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "taxonomy-card-review-completed.json";
      a.click();
    };

    document.getElementById("resetBtn").onclick = () => {
      if (!confirm("Clear all local review progress?")) return;
      localStorage.removeItem(STORAGE_KEY);
      for (const item of report.reviewQueue) {
        item.reviewerDecision = "pending";
        item.reviewerNotes = null;
      }
      render();
    };

    loadProgress();
    render();
  </script>
</body>
</html>`;
}

async function main() {
  console.log("=== Distinct-card review queue (manual sign-off artifact) ===\n");

  const { data: nodes } = await sb
    .from("catalog_taxonomy_nodes")
    .select("slug, department, label, is_active")
    .eq("is_active", true)
    .order("slug");

  const queue = new ReviewQueue();
  const nodeSummaries = [];

  for (const node of nodes ?? []) {
    if (node.slug.endsWith("/all")) continue;
    process.stderr.write(`Sampling ${node.slug}…\n`);
    nodeSummaries.push(await sampleNode(node, queue));
  }

  const reviewQueue = queue.all();

  const report = {
    generatedAt: new Date().toISOString(),
    methodology:
      "Distinct customer-facing cards; parent nodes get combined_route + direct_parent samples; global dedupe in reviewQueue",
    secondaryCheckNote: "Run taxonomy-heuristic-check.mjs separately — not manual sign-off",
    region: REGION,
    sampleCap: SAMPLE_CAP,
    uniqueCardsInQueue: reviewQueue.length,
    nodeSummaries,
    reviewQueue,
  };

  writeFileSync("scripts/taxonomy-card-review-report.json", JSON.stringify(report, null, 2));
  writeFileSync("scripts/taxonomy-card-review.html", renderReviewUi(report));

  console.table(
    nodeSummaries.map((n) => ({
      slug: n.slug,
      routeCards: n.uniqueCardCount,
      samples: n.samples.map((s) => s.sampleKind + ":" + s.sampledCount).join(", "),
    }))
  );
  console.log("\nUnique cards in review queue (deduped):", reviewQueue.length);
  console.log("Wrote scripts/taxonomy-card-review-report.json");
  console.log("Wrote scripts/taxonomy-card-review.html — open locally to review");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
