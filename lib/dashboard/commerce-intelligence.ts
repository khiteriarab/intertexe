/**
 * Commerce Intelligence — revenue density for the existing Founder Dashboard.
 * Pure helpers; no new nav pages. Goal framing defaults to $1M annual GMV.
 */

export const REVENUE_GOAL_USD = 1_000_000;

export type CommerceCategory = "Shoes" | "Clothing" | "Accessories" | "Other";

export type ProductMoneyRow = {
  key: string;
  product: string;
  brand: string;
  orders: number;
  sales: number;
  commission: number;
  /** Commission per affiliate click when clicks are known; else null. */
  rpc: number | null;
  clicks: number | null;
  category: CommerceCategory;
};

export type CategoryPerformanceRow = {
  category: CommerceCategory;
  orders: number;
  sales: number;
  commission: number;
  shareOfSales: number;
};

export type EditorialPerformanceRow = {
  key: string;
  editSlug: string;
  editMonth: string | null;
  clicks: number;
  /** Matched orders by product_name ∩ brand (best-effort). */
  orders: number;
  sales: number;
  commission: number;
  conversionRate: number | null;
  topProducts: Array<{ product: string; brand: string; clicks: number }>;
};

export type RevenueGoalProgress = {
  goalUsd: number;
  /** Best available GMV toward the goal (YTD when known, else annualized 30d run-rate). */
  progressUsd: number;
  /** Raw trailing-30d verified sales. */
  sales30d: number;
  /** Annualized run-rate from 30d sales. */
  runRateUsd: number;
  /** YTD sales when the import window covers it; else null. */
  salesYtd: number | null;
  mode: "ytd" | "annualized_30d" | "disconnected" | "demo";
  pct: number;
  remainingUsd: number;
  /** Days to goal at current 30d run-rate; null if no pace. */
  daysToGoal: number | null;
};

export type RevenueRecommendation = {
  fingerprint: string;
  title: string;
  detail: string;
  href: string;
  priority: "critical" | "growth" | "operational";
};

export type ChannelRpcRow = {
  channel: "editorial" | "shop" | "scanner";
  clicks7d: number;
  /** Attribution is imperfect — commission is not channel-split in Rakuten. */
  note: string;
};

function moneyRound(n: number) {
  return Math.round(n * 100) / 100;
}

/** Heuristic category from product + brand text (catalog join is often missing). */
export function classifyCommerceCategory(productName: string, brandName = ""): CommerceCategory {
  const blob = `${productName} ${brandName}`.toLowerCase();
  if (
    /\b(shoe|shoes|sandal|sandals|mule|mules|boot|boots|heel|heels|loafer|loafers|sneaker|sneakers|pump|pumps|flat|flats|slide|slides|thong|thongs|espadrille|clog|clogs|wedge|wedges)\b/.test(
      blob
    )
  ) {
    return "Shoes";
  }
  if (
    /\b(bag|bags|tote|clutch|wallet|belt|belts|hat|hats|scarf|scarves|jewelry|earring|necklace|bracelet|ring|sunglasses|watch)\b/.test(
      blob
    )
  ) {
    return "Accessories";
  }
  if (
    /\b(dress|dresses|top|tops|shirt|shirts|pant|pants|trouser|trousers|skirt|skirts|jacket|coats?|blazer|sweater|knit|jean|jeans|short|shorts|romper|jumpsuit|blouse|cardigan|hoodie|sweat)\b/.test(
      blob
    )
  ) {
    return "Clothing";
  }
  return "Other";
}

type TxLike = {
  product_name?: string | null;
  advertiser_name?: string | null;
  brand_name?: string | null;
  sales_amount?: number | string | null;
  commission_amount?: number | string | null;
  is_demo?: boolean;
};

type ClickLike = {
  product_name?: string | null;
  brand_name?: string | null;
  brand_slug?: string | null;
  edit_slug?: string | null;
  edit_month?: string | null;
  product_slot?: string | null;
};

function productKey(product: string, brand: string) {
  return `${brand.trim().toLowerCase()}::${product.trim().toLowerCase()}`;
}

export function buildProductMoneyRows(
  transactions: TxLike[],
  clickSamples: ClickLike[],
  limit = 8
): {
  bySales: ProductMoneyRow[];
  byCommission: ProductMoneyRow[];
  byRpc: ProductMoneyRow[];
} {
  const clicksByKey = new Map<string, number>();
  for (const c of clickSamples) {
    const product = String(c.product_name || "").trim();
    const brand = String(c.brand_name || c.brand_slug || "").trim() || "Unknown";
    if (!product) continue;
    const key = productKey(product, brand);
    clicksByKey.set(key, (clicksByKey.get(key) || 0) + 1);
  }

  const byKey = new Map<string, ProductMoneyRow>();
  for (const t of transactions) {
    if (t.is_demo) continue;
    const product = String(t.product_name || "").trim() || "Unnamed product";
    const brand = String(t.brand_name || t.advertiser_name || "").trim() || "Unknown";
    const key = productKey(product, brand);
    const sales = Number(t.sales_amount || 0);
    const commission = Number(t.commission_amount || 0);
    const cur =
      byKey.get(key) ||
      ({
        key,
        product,
        brand,
        orders: 0,
        sales: 0,
        commission: 0,
        rpc: null,
        clicks: clicksByKey.get(key) ?? null,
        category: classifyCommerceCategory(product, brand),
      } satisfies ProductMoneyRow);
    cur.orders += 1;
    cur.sales += sales;
    cur.commission += commission;
    byKey.set(key, cur);
  }

  const rows = [...byKey.values()].map((r) => {
    const clicks = clicksByKey.get(r.key) ?? r.clicks;
    const rpc = clicks != null && clicks > 0 ? moneyRound(r.commission / clicks) : null;
    return { ...r, clicks, rpc, sales: moneyRound(r.sales), commission: moneyRound(r.commission) };
  });

  const bySales = [...rows].sort((a, b) => b.sales - a.sales).slice(0, limit);
  const byCommission = [...rows].sort((a, b) => b.commission - a.commission).slice(0, limit);
  const byRpc = [...rows]
    .filter((r) => r.rpc != null && (r.clicks || 0) >= 2)
    .sort((a, b) => (b.rpc || 0) - (a.rpc || 0))
    .slice(0, limit);

  return { bySales, byCommission, byRpc };
}

export function buildCategoryPerformance(transactions: TxLike[]): CategoryPerformanceRow[] {
  const map = new Map<CommerceCategory, { orders: number; sales: number; commission: number }>();
  for (const t of transactions) {
    if (t.is_demo) continue;
    const product = String(t.product_name || "");
    const brand = String(t.brand_name || t.advertiser_name || "");
    const cat = classifyCommerceCategory(product, brand);
    const cur = map.get(cat) || { orders: 0, sales: 0, commission: 0 };
    cur.orders += 1;
    cur.sales += Number(t.sales_amount || 0);
    cur.commission += Number(t.commission_amount || 0);
    map.set(cat, cur);
  }
  const totalSales = [...map.values()].reduce((s, v) => s + v.sales, 0) || 1;
  const order: CommerceCategory[] = ["Shoes", "Clothing", "Accessories", "Other"];
  return order
    .filter((c) => map.has(c))
    .map((category) => {
      const v = map.get(category)!;
      return {
        category,
        orders: v.orders,
        sales: moneyRound(v.sales),
        commission: moneyRound(v.commission),
        shareOfSales: moneyRound(v.sales / totalSales),
      };
    });
}

export function buildEditorialPerformance(
  editorialClicks: ClickLike[],
  transactions: TxLike[]
): EditorialPerformanceRow[] {
  const byEdit = new Map<
    string,
    {
      editSlug: string;
      editMonth: string | null;
      clicks: number;
      productClicks: Map<string, { product: string; brand: string; clicks: number }>;
    }
  >();

  for (const c of editorialClicks) {
    const slug = String(c.edit_slug || "editorial").trim() || "editorial";
    const month = c.edit_month ? String(c.edit_month) : null;
    const key = `${slug}::${month || "current"}`;
    const bucket = byEdit.get(key) || {
      editSlug: slug,
      editMonth: month,
      clicks: 0,
      productClicks: new Map<string, { product: string; brand: string; clicks: number }>(),
    };
    bucket.clicks += 1;
    const product = String(c.product_name || "").trim() || "Unknown";
    const brand = String(c.brand_name || "").trim() || "Unknown";
    const pk = productKey(product, brand);
    const pc = bucket.productClicks.get(pk) || { product, brand, clicks: 0 };
    pc.clicks += 1;
    bucket.productClicks.set(pk, pc);
    byEdit.set(key, bucket);
  }

  // Best-effort join: product_name match (case-insensitive) to affiliate product_name
  const txByProduct = new Map<string, { orders: number; sales: number; commission: number }>();
  for (const t of transactions) {
    if (t.is_demo) continue;
    const name = String(t.product_name || "")
      .trim()
      .toLowerCase();
    if (!name) continue;
    const cur = txByProduct.get(name) || { orders: 0, sales: 0, commission: 0 };
    cur.orders += 1;
    cur.sales += Number(t.sales_amount || 0);
    cur.commission += Number(t.commission_amount || 0);
    txByProduct.set(name, cur);
  }

  return [...byEdit.entries()]
    .map(([key, bucket]) => {
      let orders = 0;
      let sales = 0;
      let commission = 0;
      for (const pc of bucket.productClicks.values()) {
        const hit = txByProduct.get(pc.product.toLowerCase());
        if (!hit) continue;
        // Attribute a share of that product's orders proportional to this edit's share of clicks on the name.
        // Without u1→edit join this is directional, not accounting-grade.
        orders += hit.orders;
        sales += hit.sales;
        commission += hit.commission;
      }
      const conversionRate = bucket.clicks > 0 ? orders / bucket.clicks : null;
      const topProducts = [...bucket.productClicks.values()]
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
      return {
        key,
        editSlug: bucket.editSlug,
        editMonth: bucket.editMonth,
        clicks: bucket.clicks,
        orders,
        sales: moneyRound(sales),
        commission: moneyRound(commission),
        conversionRate,
        topProducts,
      };
    })
    .sort((a, b) => b.clicks - a.clicks);
}

export function buildRevenueGoalProgress(input: {
  revenueConnected?: boolean;
  revenueIsDemo?: boolean;
  sales30d?: number | null;
  salesYtd?: number | null;
  goalUsd?: number;
}): RevenueGoalProgress {
  const goalUsd = input.goalUsd ?? REVENUE_GOAL_USD;
  const sales30d = Number(input.sales30d || 0);
  const runRateUsd = moneyRound((sales30d / 30) * 365);
  const salesYtd = input.salesYtd != null ? Number(input.salesYtd) : null;

  if (input.revenueIsDemo) {
    return {
      goalUsd,
      progressUsd: 0,
      sales30d,
      runRateUsd: 0,
      salesYtd: null,
      mode: "demo",
      pct: 0,
      remainingUsd: goalUsd,
      daysToGoal: null,
    };
  }
  if (!input.revenueConnected) {
    return {
      goalUsd,
      progressUsd: 0,
      sales30d: 0,
      runRateUsd: 0,
      salesYtd: null,
      mode: "disconnected",
      pct: 0,
      remainingUsd: goalUsd,
      daysToGoal: null,
    };
  }

  const useYtd = salesYtd != null && salesYtd > 0;
  const progressUsd = useYtd ? moneyRound(salesYtd) : runRateUsd;
  const pct = Math.min(100, moneyRound((progressUsd / goalUsd) * 100));
  const remainingUsd = Math.max(0, moneyRound(goalUsd - (useYtd ? salesYtd! : progressUsd)));
  const daily = sales30d / 30;
  const daysToGoal = daily > 0 ? Math.ceil(remainingUsd / daily) : null;

  return {
    goalUsd,
    progressUsd,
    sales30d: moneyRound(sales30d),
    runRateUsd,
    salesYtd: salesYtd != null ? moneyRound(salesYtd) : null,
    mode: useYtd ? "ytd" : "annualized_30d",
    pct,
    remainingUsd,
    daysToGoal,
  };
}

/**
 * Three concrete revenue moves for Today — fingerprints align with Action Center cards.
 */
export function buildRevenueRecommendations(input: {
  revenueConnected?: boolean;
  revenueIsDemo?: boolean;
  salesToday?: number | null;
  sales7d?: number | null;
  sales30d?: number | null;
  commission30d?: number | null;
  editorial7d?: number | null;
  shop7d?: number | null;
  scanner7d?: number | null;
  nullU1Tx30d?: number | null;
  txWithU130d?: number | null;
  topRevenueAdvertisers?: Array<{ brand: string; commission: number; sales: number }>;
  categories?: CategoryPerformanceRow[];
  topByCommission?: ProductMoneyRow[];
  goal?: RevenueGoalProgress;
}): RevenueRecommendation[] {
  const recs: RevenueRecommendation[] = [];
  const topAdv = input.topRevenueAdvertisers?.[0];
  const clicks7d =
    (input.editorial7d || 0) + (input.shop7d || 0) + (input.scanner7d || 0);
  const shoeLead = input.categories?.find((c) => c.category === "Shoes");
  const topProduct = input.topByCommission?.[0];
  const nullU1 = input.nullU1Tx30d ?? 0;
  const withU1 = input.txWithU130d ?? 0;
  const txTotal = nullU1 + withU1;

  if (input.revenueIsDemo || !input.revenueConnected) {
    recs.push({
      fingerprint: "revenue_demo_only",
      title: "Connect verified affiliate revenue",
      detail: "Import Rakuten reporting so Today can track the $1M path with real sales.",
      href: "/dashboard/commerce#revenue-goal",
      priority: "critical",
    });
  } else if ((input.salesToday ?? 0) <= 0) {
    recs.push({
      fingerprint: "no_sales_today",
      title: topAdv
        ? `Push ${topAdv.brand} today — no sales yet`
        : "Ship one high-intent commerce push today",
      detail: topAdv
        ? `${topAdv.brand} leads 30d commission. Feature it on /khiteri and shop rails, then recheck Commerce.`
        : "Quiet sales day — put one proven SKU in front of traffic before evening.",
      href: "/dashboard/commerce#action-no-sales-today",
      priority: "critical",
    });
  }

  if (shoeLead && shoeLead.shareOfSales >= 0.35 && shoeLead.sales > 0) {
    recs.push({
      fingerprint: "double_down_shoes",
      title: "Double down on shoes — your money category",
      detail: `Shoes are ${Math.round(shoeLead.shareOfSales * 100)}% of verified sales ($${Math.round(shoeLead.sales).toLocaleString()}). Stock /khiteri with sandals, mules, and heels that match what already sold.`,
      href: "/dashboard/commerce#category-performance",
      priority: "growth",
    });
  } else if (topProduct) {
    recs.push({
      fingerprint: "double_down_top_product",
      title: `Feature ${topProduct.product}`,
      detail: `${topProduct.brand} · $${Math.round(topProduct.commission).toLocaleString()} commission from ${topProduct.orders} order(s). Put it in editorial + shop.`,
      href: "/dashboard/commerce#top-products",
      priority: "growth",
    });
  } else if (topAdv && (input.editorial7d || 0) >= 3) {
    recs.push({
      fingerprint: "double_down_top_advertiser",
      title: `Double down on ${topAdv.brand}`,
      detail: `Highest 30d commission advertiser. Refresh /khiteri with ${topAdv.brand} SKUs and keep u1 on every clickout.`,
      href: "/khiteri",
      priority: "growth",
    });
  }

  if (txTotal >= 3 && nullU1 / txTotal >= 0.5) {
    recs.push({
      fingerprint: "affiliate_u1_blind",
      title: "Fix u1 so sales become learnable",
      detail: `${nullU1}/${txTotal} transactions lack u1 — you cannot optimize what converted. Confirm shop, scanner, and /khiteri append u1.`,
      href: "/dashboard/commerce#u1-health",
      priority: "operational",
    });
  } else if (clicks7d > 20 && (input.sales7d ?? 0) <= 0) {
    recs.push({
      fingerprint: "clicks_without_sales_7d",
      title: "Clicks without sales — fix the conversion mix",
      detail: `${clicks7d.toLocaleString()} affiliate clicks in 7d and $0 sales. Prioritize highest-AOV retailer and shoe SKUs that already paid.`,
      href: "/dashboard/commerce#channel-clicks",
      priority: "growth",
    });
  } else if (input.goal && input.goal.mode !== "disconnected" && input.goal.mode !== "demo") {
    recs.push({
      fingerprint: "revenue_goal_pace",
      title:
        input.goal.daysToGoal != null
          ? `Hold pace — ~${input.goal.daysToGoal} days to $1M at current run-rate`
          : "Accelerate toward the $1M goal",
      detail: `Progress ${Math.round(input.goal.pct)}% · $${Math.round(input.goal.progressUsd).toLocaleString()} toward $${(input.goal.goalUsd / 1e6).toFixed(0)}M. Raise daily GMV via editorial shoes + top advertiser.`,
      href: "/dashboard/commerce#revenue-goal",
      priority: "growth",
    });
  }

  // Always return up to 3 unique fingerprints
  const seen = new Set<string>();
  const unique: RevenueRecommendation[] = [];
  for (const r of recs) {
    if (seen.has(r.fingerprint)) continue;
    seen.add(r.fingerprint);
    unique.push(r);
    if (unique.length >= 3) break;
  }

  while (unique.length < 3) {
    unique.push({
      fingerprint: "review_commerce_intelligence",
      title: "Review Commerce Intelligence",
      detail: "Check category mix, top commission products, and editorial conversion on Commerce.",
      href: "/dashboard/commerce#commerce-intelligence",
      priority: "operational",
    });
    break;
  }

  return unique.slice(0, 3);
}

export function formatMoneyUsd(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Trailing-period funnel: attention → views → clicks → sales → money. Complements revenue totals. */
export type PerformanceFunnelStage = {
  id:
    | "scans"
    | "product_views"
    | "retailer_clicks"
    | "confirmed_sales"
    | "conversion_rate"
    | "revenue_to_retailers"
    | "affiliate_commission";
  label: string;
  value: number | null;
  kind: "count" | "money" | "percent";
  /** Share of prior volume stage (views←scans, clicks←views, sales←clicks); null when not applicable. */
  dropOffFromPrior: number | null;
};

export type PerformanceFunnel = {
  windowLabel: string;
  stages: PerformanceFunnelStage[];
  /** clicks → confirmed sales */
  conversionRate: number | null;
  diagnosis: string;
};

export function buildPerformanceFunnel(input: {
  scans7d?: number | null;
  productViews7d?: number | null;
  retailerClicks7d?: number | null;
  confirmedSales7d?: number | null;
  sales7d?: number | null;
  commission7d?: number | null;
  revenueConnected?: boolean;
  revenueIsDemo?: boolean;
}): PerformanceFunnel {
  const scans = input.scans7d ?? null;
  const views = input.productViews7d ?? null;
  const clicks = input.retailerClicks7d ?? null;
  const salesCount =
    input.revenueIsDemo || !input.revenueConnected ? null : (input.confirmedSales7d ?? null);
  const salesUsd = input.revenueIsDemo || !input.revenueConnected ? null : (input.sales7d ?? null);
  const commission =
    input.revenueIsDemo || !input.revenueConnected ? null : (input.commission7d ?? null);

  const pct = (num: number | null, den: number | null): number | null => {
    if (num == null || den == null || den <= 0) return null;
    return moneyRound((num / den) * 100);
  };

  const conversionRate = pct(salesCount, clicks);

  const stages: PerformanceFunnelStage[] = [
    {
      id: "scans",
      label: "Scans",
      value: scans,
      kind: "count",
      dropOffFromPrior: null,
    },
    {
      id: "product_views",
      label: "Product views",
      value: views,
      kind: "count",
      dropOffFromPrior: pct(views, scans),
    },
    {
      id: "retailer_clicks",
      label: "Retailer clicks",
      value: clicks,
      kind: "count",
      dropOffFromPrior: pct(clicks, views ?? scans),
    },
    {
      id: "confirmed_sales",
      label: "Confirmed sales",
      value: salesCount,
      kind: "count",
      dropOffFromPrior: conversionRate,
    },
    {
      id: "conversion_rate",
      label: "Conversion rate",
      value: conversionRate,
      kind: "percent",
      dropOffFromPrior: null,
    },
    {
      id: "revenue_to_retailers",
      label: "Revenue sent to retailers",
      value: salesUsd,
      kind: "money",
      dropOffFromPrior: null,
    },
    {
      id: "affiliate_commission",
      label: "Affiliate commission",
      value: commission,
      kind: "money",
      dropOffFromPrior: null,
    },
  ];

  let diagnosis =
    "This helps you diagnose where improvements will have the biggest impact. For example, if retailer clicks are low, you improve product pages. If clicks are high but sales are low, the retailer’s conversion experience or the products themselves may be the limiting factor.";

  if (input.revenueIsDemo || !input.revenueConnected) {
    diagnosis =
      "Connect verified affiliate reporting to complete the lower funnel. Until then, use scans → views → clicks to find attention leaks above the buy.";
  } else if ((clicks ?? 0) > 20 && (salesCount ?? 0) <= 0) {
    diagnosis =
      "Clicks are flowing but verified sales are flat — check u1 attribution, retailer landing experience, and whether featured products actually convert.";
  } else if ((views ?? 0) > 0 && (clicks ?? 0) > 0 && (pct(clicks, views) ?? 100) < 5) {
    diagnosis =
      "Product views outpace retailer clicks — tighten PDP CTAs, price clarity, and retailer assortment on high-view SKUs.";
  } else if ((scans ?? 0) > 0 && (views ?? 0) > 0 && (pct(views, scans) ?? 100) < 10) {
    diagnosis =
      "Scans aren’t turning into product views — improve post-scan recommendations and deep links into shoppable PDPs.";
  }

  return {
    windowLabel: "Trailing 7d",
    stages,
    conversionRate,
    diagnosis,
  };
}
