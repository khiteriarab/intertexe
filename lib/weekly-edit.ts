import type { SupabaseClient } from "@supabase/supabase-js";
import { getCollectionForWeek } from "./collection-rotation";
import { getFiberFactForWeek } from "./fiber-facts";

export type WeeklyEditProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  url: string;
  naturalFiberPercent: number;
  composition: string;
};

function parsePrice(val: unknown): number {
  if (val == null) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function selectWeeklyEditProducts(
  supabase: SupabaseClient,
  weekNumber: number
): Promise<WeeklyEditProduct[]> {
  const { data: products, error } = await supabase
    .from("live_products_apparel")
    .select(
      "id, name, brand_name, price, currency, image_url, url, natural_fiber_percent, composition"
    )
    .eq("currency", "USD")
    .gte("natural_fiber_percent", 90)
    .gte("price", 200)
    .not("image_url", "is", null)
    .order("natural_fiber_percent", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) throw new Error(error.message);
  if (!products || products.length < 8) {
    throw new Error("Not enough products for weekly edit");
  }

  const shuffled = [...products].sort(() => Math.random() - 0.5).slice(0, 8);

  return shuffled.map((p) => ({
    id: String(p.id),
    name: p.name || "",
    brand: p.brand_name || "",
    price: parsePrice(p.price),
    currency: p.currency || "USD",
    imageUrl: p.image_url || "",
    url: p.url || `https://www.intertexe.com/product/${p.id}`,
    naturalFiberPercent: Math.round(Number(p.natural_fiber_percent) || 0),
    composition: p.composition || "",
  }));
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
