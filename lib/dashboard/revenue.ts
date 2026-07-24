import type { HqOverviewMetrics } from "./metrics";
import type { HqInsight } from "./insights";

/** Normalize Rakuten (and similar) report headers to a canonical key. */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const HEADER_MAP: Record<string, string> = {
  transaction_id: "external_transaction_id",
  etransaction_id: "external_transaction_id",
  etransactionid: "external_transaction_id",
  transactionid: "external_transaction_id",
  trans_id: "external_transaction_id",
  order_id: "order_id",
  orderid: "order_id",
  member_id_ordernumber: "order_id",
  orders: "order_id",
  transaction_date: "transaction_date",
  transactiondate: "transaction_date",
  trans_date: "transaction_date",
  process_date: "process_date",
  processdate: "process_date",
  click_date: "click_date",
  clickdate: "click_date",
  advertiser_id: "advertiser_id",
  mid: "advertiser_id",
  merchant_id: "advertiser_id",
  offer_group_id: "advertiser_id",
  advertiser_name: "advertiser_name",
  advertiser: "advertiser_name",
  merchant_name: "advertiser_name",
  merchant: "advertiser_name",
  offer_name: "advertiser_name",
  sku: "sku",
  product_sku: "sku",
  product_name: "product_name",
  productname: "product_name",
  product: "product_name",
  product_id: "product_id",
  quantity: "quantity",
  qty: "quantity",
  number_of_items: "quantity",
  items: "quantity",
  sales: "sales_amount",
  sales_amount: "sales_amount",
  sale_amount: "sales_amount",
  gmv: "sales_amount",
  total_commissionable_sales: "sales_amount",
  commissions: "commission_amount",
  commission: "commission_amount",
  commission_amount: "commission_amount",
  total_commission: "commission_amount",
  sales_commission: "commission_amount",
  currency: "currency",
  status: "status",
  u1: "u1",
  member_id_u1: "u1",
  sid: "u1",
  subid: "u1",
};

function detectDelimiter(sample: string): string {
  const first = sample.split(/\r?\n/).find((l) => l.trim()) || "";
  const tabs = (first.match(/\t/g) || []).length;
  const commas = (first.match(/,/g) || []).length;
  return tabs >= commas ? "\t" : ",";
}

function parseLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t").map((c) => c.trim());
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseNumber(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: string | undefined): string | null {
  if (!v?.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export type ParsedAffiliateRow = {
  external_transaction_id: string | null;
  order_id: string | null;
  transaction_date: string | null;
  process_date: string | null;
  click_date: string | null;
  advertiser_id: string | null;
  advertiser_name: string | null;
  sku: string | null;
  product_name: string | null;
  product_id: string | null;
  quantity: number | null;
  sales_amount: number | null;
  commission_amount: number | null;
  currency: string | null;
  status: string | null;
  u1: string | null;
  raw: Record<string, string>;
};

export function parseAffiliateReport(text: string): {
  rows: ParsedAffiliateRow[];
  delimiter: string;
  headers: string[];
} {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return { rows: [], delimiter: ",", headers: [] };
  const delimiter = detectDelimiter(cleaned);
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  const headers = parseLine(lines[0], delimiter).map(normalizeHeader);
  const mappedKeys = headers.map((h) => HEADER_MAP[h] || null);

  const rows: ParsedAffiliateRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i], delimiter);
    const raw: Record<string, string> = {};
    const row: any = {
      external_transaction_id: null,
      order_id: null,
      transaction_date: null,
      process_date: null,
      click_date: null,
      advertiser_id: null,
      advertiser_name: null,
      sku: null,
      product_name: null,
      product_id: null,
      quantity: null,
      sales_amount: null,
      commission_amount: null,
      currency: "USD",
      status: null,
      u1: null,
    };
    headers.forEach((h, idx) => {
      const val = cells[idx] ?? "";
      raw[h] = val;
      const key = mappedKeys[idx];
      if (!key) return;
      if (key.endsWith("_date") || key === "click_date") {
        row[key] = parseDate(val);
      } else if (key === "quantity" || key === "sales_amount" || key === "commission_amount") {
        row[key] = parseNumber(val);
      } else {
        row[key] = val || null;
      }
    });
    row.raw = raw;
    if (
      !row.external_transaction_id &&
      !row.order_id &&
      row.sales_amount == null &&
      row.commission_amount == null
    ) {
      continue;
    }
    if (!row.external_transaction_id) {
      row.external_transaction_id = [
        row.order_id || "na",
        row.sku || "na",
        row.transaction_date || i,
        row.commission_amount ?? row.sales_amount ?? 0,
      ].join(":");
    }
    rows.push(row as ParsedAffiliateRow);
  }

  return { rows, delimiter, headers };
}

export function buildExecutiveSystemPrompt(input: {
  name: string;
  workspaceName: string;
  metrics: HqOverviewMetrics;
  insights: HqInsight[];
  revenue: {
    connected: boolean;
    commission7d: number | null;
    sales7d: number | null;
    transactions7d: number | null;
  };
}): string {
  const m = input.metrics;
  const clicks7d =
    (m.clickoutsLast7d.value || 0) +
    (m.scannerClickoutsLast7d.value || 0) +
    (m.editorialClickoutsLast7d.value || 0);
  const insightLines = input.insights
    .slice(0, 8)
    .map((i) => `- [${i.severity}] ${i.title}: ${i.explanation} → ${i.recommendedAction}`)
    .join("\n");

  return `You are INTERTEXE Executive AI — the private operating-system advisor for ${input.workspaceName}.
You help ${input.name} run a material intelligence company (consumer app + B2B /platform SaaS).

Tone: precise, founder-level, no hype, never invent metrics. If revenue is not connected, say so.

Live snapshot (authoritative):
- Scans today / yesterday / 7d: ${m.scansToday.value ?? "—"} / ${m.scansYesterday.value ?? "—"} / ${m.scansLast7d.value ?? "—"}
- Consumers: ${m.usersTotal.value ?? "—"} (new today: ${m.usersToday.value ?? "—"})
- Affiliate clicks 7d: ${clicks7d}
- Favorites / collections: ${m.favoritesTotal.value ?? "—"} / ${m.collectionsTotal.value ?? "—"}
- DPP-ready / catalog: ${m.dppReady.value ?? "—"} / ${m.catalogProducts.value ?? "—"}
- Leading material: ${m.topMaterialsLast30d[0]?.material ?? "—"}
- Leading brand scans: ${m.topBrandsLast30d[0]?.brand ?? "—"}
- Revenue connected: ${input.revenue.connected ? "yes" : "no"}
- Commission 7d: ${input.revenue.commission7d ?? "—"}
- Sales 7d: ${input.revenue.sales7d ?? "—"}
- Transactions 7d: ${input.revenue.transactions7d ?? "—"}

Active rule insights:
${insightLines || "- none"}

Answer questions about growth, materials, DPP readiness, campaigns, commerce, and what to do next.
Prefer short actionable answers. When suggesting campaigns, tie them to materials or scanner behavior.`;
}
