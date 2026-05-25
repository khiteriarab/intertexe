/** Quiz / listing price with guaranteed currency symbol. */
export function formatPrice(price: number | string, currency?: string): string {
  const numPrice =
    typeof price === "string" ? parseFloat(price.replace(/[^0-9.]/g, "")) : price;

  if (isNaN(numPrice)) return "";

  const curr = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  } catch {
    const symbols: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" };
    return `${symbols[curr] || `${curr} `}${Math.round(numPrice).toLocaleString()}`;
  }
}
