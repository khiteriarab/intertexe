export type RetailerPattern = {
  compositionSelectors: string[];
  priceSelectors: string[];
  nameSelectors: string[];
  imageSelectors: string[];
};

export const UNIVERSAL_IMAGE_SELECTORS = [
  'meta[property="og:image"]',
  'meta[name="twitter:image"]',
  'link[rel="image_src"]',
  '[itemprop="image"]',
];

export const RETAILER_PATTERNS: Record<string, RetailerPattern> = {
  "zara.com": {
    compositionSelectors: [
      ".composition",
      '[data-qa-id="product-composition"]',
      ".product-description",
      '[class*="composition"]',
      '[class*="material"]',
    ],
    priceSelectors: [".price", '[data-testid="product-price"]', '[class*="price"]'],
    nameSelectors: ["h1", ".product-name", '[data-qa-id="product-name"]'],
    imageSelectors: [...UNIVERSAL_IMAGE_SELECTORS],
  },
  "hm.com": {
    compositionSelectors: [
      ".composition",
      ".product-composition",
      ".materials",
      '[class*="composition"]',
      '[class*="material"]',
    ],
    priceSelectors: [".price", ".product-price", '[class*="price"]'],
    nameSelectors: ["h1", ".product-name", '[class*="product-title"]'],
    imageSelectors: [...UNIVERSAL_IMAGE_SELECTORS],
  },
  "mango.com": {
    compositionSelectors: [
      ".composition",
      ".care-composition",
      '[class*="composition"]',
      '[class*="material"]',
    ],
    priceSelectors: [".price", '[class*="price"]'],
    nameSelectors: ["h1", '[class*="product-name"]'],
    imageSelectors: [...UNIVERSAL_IMAGE_SELECTORS],
  },
};

export function getRetailerPattern(url: string): RetailerPattern | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    for (const [domain, pattern] of Object.entries(RETAILER_PATTERNS)) {
      if (hostname.includes(domain)) return pattern;
    }
  } catch {
    return null;
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchSelectorHtml(html: string, selector: string): string {
  const classMatch = selector.match(/^\.([a-zA-Z0-9_-]+)$/);
  if (classMatch) {
    const className = classMatch[1];
    const regex = new RegExp(
      `class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
      "i"
    );
    const hit = html.match(regex);
    if (hit?.[1]) return stripHtml(hit[1]);
  }

  const dataMatch = selector.match(/^\[([^=\]]+)=["']([^"']+)["']\]$/);
  if (dataMatch) {
    const [, attr, value] = dataMatch;
    const regex = new RegExp(
      `${attr}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
      "i"
    );
    const hit = html.match(regex);
    if (hit?.[1]) return stripHtml(hit[1]);
  }

  if (selector === "h1") {
    const hit = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (hit?.[1]) return stripHtml(hit[1]);
  }

  return "";
}

function firstMatch(html: string, selectors: string[]): string {
  for (const selector of selectors) {
    const value = matchSelectorHtml(html, selector).trim();
    if (value) return value;
  }
  return "";
}

function extractCompositionFromText(text: string): string {
  const match = text.match(
    /(\d+(?:\.\d+)?%\s*[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\s/]*?(?:,\s*\d+(?:\.\d+)?%\s*[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\s/]*?)*)/i
  );
  return match?.[1]?.trim() || "";
}

/** Universal image extraction — works for any retailer product page HTML. */
export async function fetchProductImageFromURL(url: string): Promise<string | null> {
  try {
    const html = await fetchPageHTML(url);
    if (!html) return null;
    return extractProductImageFromHTML(html);
  } catch {
    return null;
  }
}

export function extractProductImageFromHTML(html: string): string | null {
  const patterns = [
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
    /<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
    /"image"\s*:\s*"(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
    /"image"\s*:\s*\[\s*"(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.startsWith("http")) {
      return match[1];
    }
  }
  return null;
}

export function extractWithSelectors(
  html: string,
  pattern: RetailerPattern
): {
  brandName?: string;
  productName?: string;
  price?: string;
  composition?: string;
  imageUrl?: string;
  confidence?: string;
  inputType?: string;
} | null {
  const name = firstMatch(html, pattern.nameSelectors);
  const price = firstMatch(html, pattern.priceSelectors);
  const compositionBlock = firstMatch(html, pattern.compositionSelectors);
  const composition =
    extractCompositionFromText(compositionBlock) ||
    extractCompositionFromText(html.slice(0, 12000));
  const imageUrl = extractProductImageFromHTML(html) || undefined;

  if (!composition && !name && !price && !imageUrl) return null;

  return {
    productName: name || undefined,
    price: price || undefined,
    composition: composition || undefined,
    imageUrl,
    confidence: composition ? "high" : "medium",
    inputType: "url",
  };
}

export async function fetchPageHTML(url: string): Promise<string> {
  const pageRes = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,es;q=0.8,fr;q=0.7",
    },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
  });
  if (!pageRes.ok) return "";
  return pageRes.text();
}
