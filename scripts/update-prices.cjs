const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_SIZE = 50;
const DELAY_MS = 500;
const SALE_THRESHOLD = 0.20;

function parsePrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}

function formatPrice(num) {
  return `$${num.toFixed(2)}`;
}

async function fetchShopifyPrice(url) {
  try {
    const murlMatch = url.match(/murl=([^&]+)/);
    const productUrl = murlMatch ? decodeURIComponent(murlMatch[1]) : url;

    const jsonUrl = productUrl.split("?")[0];
    const handle = jsonUrl.split("/products/").pop();
    if (!handle) return null;

    const domain = new URL(jsonUrl).origin;
    const res = await fetch(`${domain}/products/${handle}.json`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status !== 200) return null;

    const json = await res.json();
    const product = json.product;
    if (!product?.variants?.length) return null;

    const firstVariant = product.variants[0];
    const price = parseFloat(firstVariant.price);
    const compareAt = firstVariant.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;

    return { price, compareAtPrice: compareAt };
  } catch {
    return null;
  }
}

async function run() {
  console.log("Starting price update job...");

  let offset = 0;
  let totalUpdated = 0;
  let totalSale = 0;
  let totalProcessed = 0;

  while (true) {
    const { data: products, error } = await sb
      .from("products")
      .select("id, url, price, original_price, is_sale, brand_slug")
      .eq("approved", "yes")
      .not("url", "is", null)
      .order("id")
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("Query error:", error.message);
      break;
    }

    if (!products || products.length === 0) break;

    for (const product of products) {
      totalProcessed++;

      if (!product.url || !product.url.includes("/products/")) {
        continue;
      }

      const result = await fetchShopifyPrice(product.url);
      if (!result) continue;

      const currentDbPrice = parsePrice(product.price);
      const newPrice = result.price;
      const compareAtPrice = result.compareAtPrice;

      if (!newPrice || newPrice <= 0) continue;

      const updates = {};

      if (currentDbPrice && Math.abs(currentDbPrice - newPrice) > 0.01) {
        updates.price = formatPrice(newPrice);
        totalUpdated++;
      }

      const referencePrice = compareAtPrice || parsePrice(product.original_price) || currentDbPrice;

      if (!product.original_price && referencePrice && referencePrice > newPrice) {
        updates.original_price = formatPrice(referencePrice);
      }

      const origPrice = parsePrice(updates.original_price || product.original_price);
      if (origPrice && newPrice < origPrice * (1 - SALE_THRESHOLD)) {
        updates.is_sale = true;
        totalSale++;
      } else if (origPrice && newPrice >= origPrice * 0.95) {
        updates.is_sale = false;
        if (!product.original_price) updates.original_price = null;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await sb
          .from("products")
          .update(updates)
          .eq("id", product.id);

        if (updateError) {
          console.error(`Failed to update ${product.id}:`, updateError.message);
        }
      }

      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    console.log(`Processed ${totalProcessed} products (${totalUpdated} prices updated, ${totalSale} on sale)`);

    if (products.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log(`\nDone. Processed: ${totalProcessed}, Prices updated: ${totalUpdated}, Flagged as sale: ${totalSale}`);
}

run().catch(console.error);
