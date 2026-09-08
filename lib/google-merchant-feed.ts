import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { consumerExclusionForProduct } from "./catalog-consumer-guard";

const BASE_URL = "https://www.intertexe.com";
const MIN_NATURAL_FIBER = 80;
const PAGE_SIZE = 100;

export type GoogleMerchantFeedRow = {
  id: string;
  name: string;
  brand_name: string | null;
  composition: string | null;
  image_url: string | null;
  price: string | null;
  url: string | null;
  category: string | null;
  color: string | null;
  stock_status: string | null;
  is_sale: boolean | null;
  original_price: string | null;
  natural_fiber_percent?: number | null;
};

export function getGoogleMerchantSupabase(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parsePriceUsd(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n.toFixed(2)} USD`;
}

function availabilityFromStock(stockStatus: string | null | undefined): string {
  const status = (stockStatus || "").toLowerCase();
  if (
    /sold[\s_-]?out/.test(status) ||
    /out[\s_-]?of[\s_-]?stock/.test(status) ||
    status === "unavailable" ||
    status === "discontinued"
  ) {
    return "out_of_stock";
  }
  return "in_stock";
}

export function rowQualifiesForGoogleMerchant(row: GoogleMerchantFeedRow): boolean {
  if ((row.natural_fiber_percent ?? 0) < MIN_NATURAL_FIBER) return false;
  if (!row.id || !row.name?.trim()) return false;
  if (!row.image_url?.trim()) return false;
  if (!parsePriceUsd(row.price)) return false;

  const exclusion = consumerExclusionForProduct({
    name: row.name,
    category: row.category,
    composition: row.composition ?? "",
    imageUrl: row.image_url,
    price: row.price ?? "",
    url: row.url ?? "",
    brandSlug: null,
    stockStatus: row.stock_status,
  });
  return !exclusion;
}

export function googleMerchantItemXml(row: GoogleMerchantFeedRow): string {
  const price = parsePriceUsd(row.price);
  if (!price) return "";

  const title = [row.brand_name, row.name].filter(Boolean).join(" — ").trim();
  const description =
    [row.name, row.composition?.trim()].filter(Boolean).join(". ").slice(0, 5000) || row.name;
  const link = `${BASE_URL}/product/${row.id}`;
  const imageLink = row.image_url!.trim();
  const brand = (row.brand_name || "Intertexe").trim();
  const availability = availabilityFromStock(row.stock_status);

  let item = "    <item>\n";
  item += `      <g:id>${xmlEscape(row.id)}</g:id>\n`;
  item += `      <g:title>${xmlEscape(title)}</g:title>\n`;
  item += `      <g:description>${xmlEscape(description)}</g:description>\n`;
  item += `      <g:link>${xmlEscape(link)}</g:link>\n`;
  if (row.url?.trim()) {
    item += `      <g:mobile_link>${xmlEscape(row.url.trim())}</g:mobile_link>\n`;
  }
  item += `      <g:image_link>${xmlEscape(imageLink)}</g:image_link>\n`;
  const currentPrice = parsePriceUsd(row.price);
  const originalPrice = parsePriceUsd(row.original_price);
  if (row.is_sale && originalPrice && currentPrice && originalPrice !== currentPrice) {
    item += `      <g:price>${originalPrice}</g:price>\n`;
    item += `      <g:sale_price>${currentPrice}</g:sale_price>\n`;
  } else {
    item += `      <g:price>${price}</g:price>\n`;
  }
  item += `      <g:availability>${availability}</g:availability>\n`;
  item += `      <g:brand>${xmlEscape(brand)}</g:brand>\n`;
  item += `      <g:condition>new</g:condition>\n`;
  item += `      <g:gender>female</g:gender>\n`;
  item += `      <g:age_group>adult</g:age_group>\n`;
  item += `      <g:google_product_category>1604</g:google_product_category>\n`;
  if (row.color?.trim()) {
    item += `      <g:color>${xmlEscape(row.color.trim())}</g:color>\n`;
  }
  item += "    </item>\n";
  return item;
}

export async function* iterateGoogleMerchantRows(
  supabase: SupabaseClient
): AsyncGenerator<GoogleMerchantFeedRow> {
  let cursor: string | null = null;

  for (;;) {
    let q = supabase
      .from("products")
      .select(
        "id, name, brand_name, composition, image_url, price, url, category, color, stock_status, is_sale, original_price, natural_fiber_percent"
      )
      .gte("natural_fiber_percent", MIN_NATURAL_FIBER)
      .eq("is_active", true)
      .eq("is_displayable", true)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .not("price", "is", null)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);

    if (cursor) q = q.gt("id", cursor);

    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;

    for (const row of data as GoogleMerchantFeedRow[]) {
      if (rowQualifiesForGoogleMerchant(row)) yield row;
    }

    cursor = String(data[data.length - 1].id);
    if (data.length < PAGE_SIZE) break;
  }
}

export function googleMerchantFeedHeader(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    "  <channel>\n" +
    "    <title>Intertexe — Natural Fiber Apparel</title>\n" +
    `    <link>${BASE_URL}</link>\n` +
    "    <description>Verified natural-fiber women's apparel (≥80% natural fiber)</description>\n"
  );
}

export function googleMerchantFeedFooter(): string {
  return "  </channel>\n</rss>\n";
}
