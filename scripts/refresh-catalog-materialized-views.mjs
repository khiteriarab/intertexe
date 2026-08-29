#!/usr/bin/env node
/** CLI wrapper — refreshes apparel + footwear catalog materialized views. */
import { refreshCatalogMaterializedViews } from "../lib/feed-sync/rakuten-sync.js";

const footwearOnly = process.argv.includes("--footwear-only");
const apparelOnly = process.argv.includes("--apparel-only");
const views = footwearOnly
  ? ["live_products_footwear"]
  : apparelOnly
    ? ["live_products_apparel_mat"]
    : undefined;

refreshCatalogMaterializedViews(views)
  .then((refreshed) => {
    console.log(JSON.stringify({ ok: true, refreshed }, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
