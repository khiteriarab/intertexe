#!/usr/bin/env node
/**
 * Batched is_displayable refresh — only in_stock / low_stock rows stay browsable.
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/refresh-displayable-sbp.mjs
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/refresh-displayable-sbp.mjs --rounds=2000
 */
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || 'burrylupizvggupsryuj';
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const BATCH = Number(process.env.DISPLAYABLE_BATCH || 400);
const MAX_ROUNDS = Number(process.argv.find((a) => a.startsWith('--rounds='))?.split('=')[1] || 1200);

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN required');
  process.exit(1);
}

const DISPLAYABLE_EXPR = `
  p.approved = 'yes'
  AND coalesce(p.is_active, true) IS TRUE
  AND trim(coalesce(p.composition, '')) <> ''
  AND coalesce(p.natural_fiber_percent, 0) >= 80
  AND coalesce(p.stock_status, '') IN ('in_stock', 'low_stock')
  AND p.image_url IS NOT NULL
  AND trim(coalesce(p.image_url, '')) <> ''
  AND coalesce(p.gender_scope, '') NOT IN ('men', 'male', 'mens', 'boys')
`;

async function sql(query) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${res.status} ${text.slice(0, 300)}`);
  }
  if (data?.message) throw new Error(data.message);
  return data;
}

async function main() {
  let total = 0;
  let cursorId = '00000000-0000-0000-0000-000000000000';
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    try {
      const rows = await sql(`
        WITH batch AS (
          SELECT id FROM products
          WHERE approved = 'yes'
            AND coalesce(is_active, true) IS TRUE
            AND id > '${cursorId}'::uuid
          ORDER BY id
          LIMIT ${BATCH}
        )
        UPDATE products p
        SET is_displayable = (${DISPLAYABLE_EXPR}),
            updated_at = now()
        FROM batch b
        WHERE p.id = b.id
        RETURNING p.id;
      `);
      const n = Array.isArray(rows) ? rows.length : 0;
      total += n;
      if (n > 0) {
        cursorId = rows.map((r) => r.id).sort().pop();
      }
      if (round % 10 === 0 || n === 0 || round <= 3) {
        console.log(`[displayable ${round}] +${n} total=${total} cursor=${cursorId.slice(0, 8)}`);
      }
      if (n === 0) break;
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.warn(`[displayable ${round}]`, e.message);
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  const stats = await sql(`
    SELECT
      count(*) FILTER (WHERE is_displayable IS TRUE)::int AS displayable,
      count(*) FILTER (WHERE is_displayable IS TRUE AND stock_status IN ('in_stock','low_stock'))::int AS displayable_in_stock,
      count(*) FILTER (WHERE is_displayable IS TRUE AND coalesce(stock_status,'') NOT IN ('in_stock','low_stock'))::int AS displayable_bad
    FROM products;
  `);
  console.log('[displayable] final', stats?.[0] ?? stats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
