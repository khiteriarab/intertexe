const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function ensureSupabaseTable() {
  console.log("Ensuring products table exists in Supabase...");
  const { error } = await supabase.rpc("exec_sql", {
    sql_query: `
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_slug TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        name TEXT NOT NULL,
        product_id TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        image_url TEXT,
        price TEXT,
        composition TEXT,
        natural_fiber_percent INTEGER,
        category TEXT NOT NULL DEFAULT 'dresses',
        approved TEXT NOT NULL DEFAULT 'yes',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  });
  if (error) {
    console.log("Note: Could not create table via RPC (this is normal — create it manually if needed)");
    console.log("  Error:", error.message);
  }
}

async function syncProducts() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  INTERTEXE → Supabase Product Sync       ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const client = await pool.connect();
  const { rows: localProducts } = await client.query(
    "SELECT * FROM products WHERE approved = 'yes' ORDER BY brand_name, name"
  );
  client.release();

  console.log(`Local database: ${localProducts.length} approved products\n`);

  let { data: existingProducts, error: fetchError } = await supabase
    .from("products")
    .select("product_id");

  if (fetchError && fetchError.message.includes("products")) {
    console.log("Products table not found in Supabase. Creating it...");
    const { error: createError } = await supabase.rpc("query", {
      query_text: `
        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_slug TEXT NOT NULL,
          brand_name TEXT NOT NULL,
          name TEXT NOT NULL,
          product_id TEXT NOT NULL UNIQUE,
          url TEXT NOT NULL,
          image_url TEXT,
          price TEXT,
          composition TEXT,
          natural_fiber_percent INTEGER,
          category TEXT NOT NULL DEFAULT 'dresses',
          approved TEXT NOT NULL DEFAULT 'yes',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
      `,
    });

    if (createError) {
      console.log("Could not auto-create table. Please run supabase-products-migration.sql manually in your Supabase SQL Editor.");
      console.log("The migration file has been updated with all " + localProducts.length + " products.");
      await pool.end();
      process.exit(0);
    }

    const refetch = await supabase.from("products").select("product_id");
    existingProducts = refetch.data;
    fetchError = refetch.error;
  }

  if (fetchError) {
    console.error("Error fetching Supabase products:", fetchError.message);
    console.log("\nPlease run supabase-products-migration.sql in your Supabase SQL Editor first.");
    await pool.end();
    process.exit(0);
  }

  const existingIds = new Set((existingProducts || []).map((p) => p.product_id));
  console.log(`Supabase: ${existingIds.size} existing products\n`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const p of localProducts) {
    const record = {
      brand_slug: p.brand_slug,
      brand_name: p.brand_name,
      name: p.name,
      product_id: p.product_id,
      url: p.url,
      image_url: p.image_url,
      price: p.price,
      composition: p.composition,
      natural_fiber_percent: p.natural_fiber_percent,
      category: p.category,
      approved: "yes",
    };

    if (existingIds.has(p.product_id)) {
      const { error } = await supabase
        .from("products")
        .update(record)
        .eq("product_id", p.product_id);

      if (error) {
        console.log(`  ✗ Update failed: ${p.name} — ${error.message}`);
        errors++;
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase.from("products").insert(record);

      if (error) {
        console.log(`  ✗ Insert failed: ${p.name} — ${error.message}`);
        errors++;
      } else {
        inserted++;
        console.log(`  + ${p.brand_name}: ${p.name}`);
      }
    }
  }

  console.log("\n═══ SYNC RESULTS ═══");
  console.log(`  New products inserted: ${inserted}`);
  console.log(`  Existing products updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total in Supabase: ${existingIds.size + inserted}`);

  const fs = require("fs");
  const sqlLines = [
    "-- INTERTEXE Products — Auto-generated Supabase migration",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total products: ${localProducts.length}`,
    "",
    "CREATE TABLE IF NOT EXISTS products (",
    "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),",
    "  brand_slug TEXT NOT NULL,",
    "  brand_name TEXT NOT NULL,",
    "  name TEXT NOT NULL,",
    "  product_id TEXT NOT NULL UNIQUE,",
    "  url TEXT NOT NULL,",
    "  image_url TEXT,",
    "  price TEXT,",
    "  composition TEXT,",
    "  natural_fiber_percent INTEGER,",
    "  category TEXT NOT NULL DEFAULT 'dresses',",
    "  approved TEXT NOT NULL DEFAULT 'yes',",
    "  created_at TIMESTAMPTZ DEFAULT NOW()",
    ");",
    "",
    "ALTER TABLE products ENABLE ROW LEVEL SECURITY;",
    'CREATE POLICY IF NOT EXISTS "Allow public read" ON products FOR SELECT USING (true);',
    "",
    `-- ${localProducts.length} products`,
    "",
  ];

  for (const r of localProducts) {
    const esc = (s) => (s ? s.replace(/'/g, "''") : "");
    sqlLines.push(
      `INSERT INTO products (brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category) VALUES ('${esc(r.brand_slug)}', '${esc(r.brand_name)}', '${esc(r.name)}', '${esc(r.product_id)}', '${esc(r.url)}', '${esc(r.image_url)}', '${esc(r.price)}', '${esc(r.composition)}', ${r.natural_fiber_percent}, '${esc(r.category)}') ON CONFLICT (product_id) DO UPDATE SET composition = EXCLUDED.composition, natural_fiber_percent = EXCLUDED.natural_fiber_percent, image_url = EXCLUDED.image_url, price = EXCLUDED.price;`
    );
  }

  fs.writeFileSync("supabase-products-migration.sql", sqlLines.join("\n"));
  console.log(`\n  Updated supabase-products-migration.sql (${localProducts.length} products)`);

  await pool.end();
  console.log("\nSync complete!");
}

syncProducts().catch((e) => {
  console.error("Fatal error:", e);
  pool.end();
  process.exit(1);
});
