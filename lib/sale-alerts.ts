export type SaleAlertContext = {
  captureId?: string | null;
  category?: string | null;
  productType?: string | null;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  materials?: string | null;
  naturalFiberPercent?: number | null;
  retailer?: string | null;
  source?: string | null;
};

export function saleAlertContextFromBody(body: Record<string, unknown>): SaleAlertContext | null {
  const capture = body.capture && typeof body.capture === "object" ? (body.capture as Record<string, unknown>) : body;
  const priceRaw = capture.price ?? body.price;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : priceRaw != null
        ? parseFloat(String(priceRaw).replace(/[^0-9.]/g, ""))
        : NaN;
  const ctx: SaleAlertContext = {
    captureId: str(capture.captureId ?? capture.id ?? body.captureId),
    category: str(capture.category ?? capture.subcategory ?? body.category),
    productType: str(capture.productType ?? capture.subcategory ?? capture.itemType ?? body.productType),
    brand: str(capture.brandName ?? capture.brand_name ?? body.brand),
    price: Number.isFinite(price) && price > 0 ? price : null,
    currency: str(capture.currency ?? body.currency),
    materials: str(capture.compositionText ?? capture.composition_text ?? body.materials),
    naturalFiberPercent: num(capture.naturalFiberPercent ?? capture.natural_fiber_percent ?? body.naturalFiberPercent),
    retailer: str(capture.retailer ?? body.retailer),
    source: str(body.source) || "chrome_extension",
  };
  const hasSignal = Boolean(
    ctx.captureId || ctx.category || ctx.brand || ctx.materials || ctx.retailer || ctx.price
  );
  return hasSignal ? ctx : null;
}

export function scoreSaleProduct(
  product: {
    brand_name?: string | null;
    category?: string | null;
    composition?: string | null;
    price?: unknown;
    natural_fiber_percent?: number | null;
  },
  ctx: SaleAlertContext | null
): number {
  let score = Number(product.natural_fiber_percent) || 0;
  if (!ctx) return score;
  const brand = String(product.brand_name || "").toLowerCase();
  const category = String(product.category || "").toLowerCase();
  const composition = String(product.composition || "").toLowerCase();
  if (ctx.brand && brand && brand.includes(ctx.brand.toLowerCase())) score += 40;
  if (ctx.category && category && category.includes(ctx.category.toLowerCase())) score += 25;
  if (ctx.productType && category && category.includes(ctx.productType.toLowerCase())) score += 15;
  if (ctx.materials) {
    const tokens = ctx.materials.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 3);
    if (tokens.some((token) => composition.includes(token))) score += 20;
  }
  const productPrice = parseFloat(String(product.price ?? "").replace(/[^0-9.]/g, ""));
  if (ctx.price && Number.isFinite(productPrice) && productPrice > 0) {
    const ratio = productPrice / ctx.price;
    if (ratio >= 0.6 && ratio <= 1.4) score += 10;
  }
  return score;
}

function str(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
}
