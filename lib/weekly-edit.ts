import type { SupabaseClient } from "@supabase/supabase-js";
import { isFootwearListing } from "./catalog-product-filters";
import { getCollectionForWeek } from "./collection-rotation";
import { getFiberFactForWeek } from "./fiber-facts";

/** INTERTEXE brand socials — Weekly Edit follow CTA (not @Khiteri). */
export const INTERTEXE_SOCIAL_HANDLE = "@intertexe";
export const INTERTEXE_INSTAGRAM_URL = "https://www.instagram.com/intertexe";
export const INTERTEXE_TIKTOK_URL = "https://www.tiktok.com/@intertexe";

export const WEEKLY_EDIT_MIX = {
  shoes: 2,
  clothing: 3,
  sale: 3,
} as const;

export type WeeklyEditSection = "shoes" | "clothing" | "sale";

export type WeeklyEditProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  imageUrl: string;
  url: string;
  naturalFiberPercent: number;
  composition: string;
  category?: string;
  isSale?: boolean;
  section?: WeeklyEditSection;
};

export type WeeklyEditPickInput = {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  currency: string;
  imageUrl: string;
  url: string;
  naturalFiberPercent: number;
  composition: string;
  category: string;
  isSale: boolean;
};

function parsePrice(val: unknown): number {
  if (val == null) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function isOnSale(product: { isSale?: boolean; price: number; originalPrice?: number | null }): boolean {
  if (product.isSale) return true;
  const original = Number(product.originalPrice || 0);
  return original > product.price && product.price > 0;
}

function takeUnused<T extends { id: string }>(pool: T[], count: number, seen: Set<string>): T[] {
  const out: T[] = [];
  for (const item of pool) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= count) break;
  }
  return out;
}

/**
 * Always 2 shoes + 3 clothing + 3 sale from curator `is_editor_pick` rows.
 * Never fills from the random apparel catalog (that path put the Loewe poplin shirt in the edit).
 */
export function assembleWeeklyEditPicks(picks: WeeklyEditPickInput[]): WeeklyEditProduct[] {
  const shoesPool = picks
    .filter((p) => isFootwearListing(p))
    .sort((a, b) => Number(isOnSale(a)) - Number(isOnSale(b)));
  const clothingPool = picks
    .filter((p) => !isFootwearListing(p))
    .sort((a, b) => Number(isOnSale(a)) - Number(isOnSale(b)));
  const salePool = picks.filter((p) => isOnSale(p));

  const seen = new Set<string>();
  const shoes = takeUnused(shoesPool, WEEKLY_EDIT_MIX.shoes, seen);
  const clothing = takeUnused(clothingPool, WEEKLY_EDIT_MIX.clothing, seen);
  const sale = takeUnused(salePool, WEEKLY_EDIT_MIX.sale, seen);

  const tagged = [
    ...shoes.map((p) => ({ ...p, section: "shoes" as const, isSale: isOnSale(p) })),
    ...clothing.map((p) => ({ ...p, section: "clothing" as const, isSale: isOnSale(p) })),
    ...sale.map((p) => ({ ...p, section: "sale" as const, isSale: true })),
  ];

  return tagged.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    originalPrice: p.originalPrice > p.price ? p.originalPrice : null,
    currency: p.currency,
    imageUrl: p.imageUrl,
    url: p.url,
    naturalFiberPercent: p.naturalFiberPercent,
    composition: p.composition,
    category: p.category,
    isSale: p.isSale,
    section: p.section,
  }));
}

function mapEditorPickRow(row: Record<string, unknown>): WeeklyEditPickInput | null {
  const id = String(row.product_id || row.id || "").trim();
  const imageUrl = String(row.image_url || "").trim();
  const name = String(row.name || "").trim();
  if (!id || !imageUrl || !name) return null;
  const price = parsePrice(row.price);
  if (!(price > 0)) return null;
  const originalPrice = parsePrice(row.original_price);
  return {
    id,
    name,
    brand: String(row.brand_name || "").trim(),
    price,
    originalPrice,
    currency: String(row.currency || "USD"),
    imageUrl,
    url: `https://www.intertexe.com/product/${id}`,
    naturalFiberPercent: Math.round(Number(row.natural_fiber_percent) || 0),
    composition: String(row.composition || ""),
    category: String(row.category || ""),
    isSale: row.is_sale === true || (originalPrice > price && price > 0),
  };
}

export async function selectWeeklyEditProducts(
  supabase: SupabaseClient,
  _weekNumber?: number
): Promise<WeeklyEditProduct[]> {
  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, product_id, name, brand_name, price, original_price, currency, image_url, url, natural_fiber_percent, composition, category, is_sale, is_editor_pick, editor_picked_at, region, is_displayable"
    )
    .eq("is_editor_pick", true)
    .eq("is_displayable", true)
    .eq("region", "us")
    .not("image_url", "is", null)
    .not("price", "is", null)
    .order("editor_picked_at", { ascending: false })
    .limit(72);

  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const picks: WeeklyEditPickInput[] = [];
  for (const row of products || []) {
    const mapped = mapEditorPickRow(row as Record<string, unknown>);
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    picks.push(mapped);
  }

  const assembled = assembleWeeklyEditPicks(picks);
  if (!assembled.length) {
    throw new Error("Not enough editor's picks for weekly edit");
  }
  return assembled;
}

export function getWeeklyEditMeta(weekNumber: number) {
  const fiberFact = getFiberFactForWeek(weekNumber);
  const collection = getCollectionForWeek(weekNumber);
  return { fiberFact, collection };
}

export async function listMarketingSubscriberEmails(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data: preferenceSubscribers, error: prefError } = await supabase
    .from("user_preferences")
    .select("email")
    .eq("marketing_emails", true)
    .is("unsubscribed_at", null)
    .not("email", "is", null);

  if (prefError) throw new Error(prefError.message);

  const fromPreferences = (preferenceSubscribers || [])
    .map((row) => row.email)
    .filter((value): value is string => Boolean(value));

  if (fromPreferences.length > 0) {
    return fromPreferences;
  }

  const { data: optedOut, error: optOutError } = await supabase
    .from("user_preferences")
    .select("email, user_id")
    .or("marketing_emails.eq.false,unsubscribed_at.not.is.null");

  if (optOutError) throw new Error(optOutError.message);

  const optedOutEmails = new Set(
    (optedOut || [])
      .map((row) => (row.email ? String(row.email).toLowerCase() : null))
      .filter((value): value is string => Boolean(value))
  );
  const optedOutUserIds = new Set(
    (optedOut || []).map((row) => row.user_id).filter((value): value is string => Boolean(value))
  );

  const emails: string[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    for (const user of data.users) {
      if (!user.email) continue;
      const normalized = user.email.toLowerCase();
      if (optedOutUserIds.has(user.id) || optedOutEmails.has(normalized)) continue;
      emails.push(user.email);
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return emails;
}
