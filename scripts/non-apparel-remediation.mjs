const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "burrylupizvggupsryuj";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TOKEN) {
  throw new Error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_SERVICE_ROLE_KEY");
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const NON_APPAREL_NAME_TERMS = [
  "lubricant", "lube", "supplement", "vitamin", "candle",
  "perfume", "fragrance", "skincare", "serum", "moisturizer",
  "toy", "accessory kit", "gift set", "beauty", "cosmetic",
  "book", "home", "decor", "furniture", "electronics",
  "shoe care", "bag care", "leather care", "cleaner",
];

const likeTerms = NON_APPAREL_NAME_TERMS.map((term) => `'%${term.replace(/'/g, "''")}%'`).join(", ");

const targetUpdate = await sql(`
  UPDATE public.products
  SET is_active = false,
      approved = 'no',
      display_excluded_reason = 'non_apparel_product'
  WHERE id = '6a9245b2-cde8-4758-8fcf-955aaf188cb0'
  RETURNING id;
`);

const foundRows = await sql(`
  SELECT id, brand_name, name, category
  FROM public.products
  WHERE approved = 'yes'
    AND coalesce(is_active, true) = true
    AND (
      lower(name) LIKE ANY (ARRAY[${likeTerms}])
      OR lower(coalesce(category, '')) LIKE ANY (ARRAY['%beauty%', '%health%', '%wellness%'])
    )
  ORDER BY brand_name NULLS LAST, name NULLS LAST
  LIMIT 500;
`);

const ids = (foundRows || []).map((r) => r.id).filter(Boolean);
if (ids.length > 0) {
  await sql(`
    UPDATE public.products
    SET is_active = false,
        approved = 'no',
        display_excluded_reason = 'non_apparel_product'
    WHERE id = ANY(ARRAY[${ids.map((id) => `'${id}'`).join(", ")}]::uuid[]);
  `);
}

await sql(`
  CREATE OR REPLACE VIEW public.live_products_apparel AS
  SELECT p.*
  FROM public.products p
  WHERE p.approved = 'yes'
    AND p.is_active = true
    AND p.natural_fiber_percent >= 80
    AND p.image_url IS NOT NULL
    AND (
      p.gender_scope IS NULL
      OR p.gender_scope NOT IN ('men', 'male', 'mens', 'boys')
    )
    AND p.name NOT ILIKE '%lubricant%'
    AND p.name NOT ILIKE '%lube%'
    AND p.name NOT ILIKE '%supplement%'
    AND p.name NOT ILIKE '%vitamin%'
    AND p.name NOT ILIKE '%fragrance%'
    AND p.name NOT ILIKE '%perfume%'
    AND p.name NOT ILIKE '%skincare%'
    AND p.name NOT ILIKE '%serum%'
    AND p.category NOT ILIKE '%beauty%'
    AND p.category NOT ILIKE '%health%'
    AND p.category NOT ILIKE '%wellness%';
`);

await sql(`NOTIFY pgrst, 'reload schema';`);

const counts = await sql(`
  SELECT
    (SELECT count(*) FROM public.live_products_apparel WHERE brand_slug = 'lagence') AS lagence,
    (SELECT count(*) FROM public.live_products_apparel WHERE brand_slug = 'l-agence') AS l_agence,
    (SELECT count(*) FROM public.live_products_apparel WHERE brand_slug = '7-for-all-mankind') AS seven_for_all_mankind,
    (SELECT count(*) FROM public.live_products_apparel WHERE brand_slug = '7forallmankind') AS sevenforallmankind,
    (SELECT count(*) FROM public.live_products_apparel WHERE brand_name ILIKE '%agence%') AS lagence_name_total,
    (SELECT count(*) FROM public.live_products_apparel WHERE brand_name ILIKE '%7 for all%') AS seven_name_total;
`);

console.log(
  JSON.stringify(
    {
      targetRemoved: Array.isArray(targetUpdate) ? targetUpdate.length > 0 : false,
      nonApparelFound: ids.length,
      removedProducts: (foundRows || []).slice(0, 50).map((r) => `${r.brand_name || "Unknown"} — ${r.name}`),
      brandCounts: (counts && counts[0]) || {},
    },
    null,
    2
  )
);
