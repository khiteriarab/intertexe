/**
 * OpenAI fallback for external capture enrichment.
 * Reuses the same OpenAI env/integration as /api/scan — no second AI stack.
 * Never overwrites verified / structured retailer fields; only fills gaps.
 */

import OpenAI from "openai";
import type { CaptureEnrichment, ProvenanceEntry } from "./capture-enrichment";

export type AiEnrichmentUsage = {
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  at: string;
};

export type AiEnrichmentResult = {
  patch: Partial<CaptureEnrichment>;
  provenance: Record<string, ProvenanceEntry>;
  usage: AiEnrichmentUsage;
  skipped: boolean;
  reason?: string;
};

function getOpenAIClient(): OpenAI | null {
  const apiKey = [
    process.env.OPENAI_API_KEY,
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    process.env.VITE_OPENAI_API_KEY,
  ]
    .map((k) => (k || "").trim())
    .find((k) => k && k.length > 20 && !/^\[?SENSITIVE\]?$/i.test(k));
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

function setProv(
  provenance: Record<string, ProvenanceEntry>,
  key: string,
  confidence: number
) {
  provenance[key] = {
    source: "openai_inferred",
    confidence,
    model: process.env.CAPTURE_ENRICHMENT_AI_MODEL || "gpt-4o-mini",
    at: new Date().toISOString(),
  };
}

/**
 * Call OpenAI only to fill missing fields. Deterministic values win.
 */
export async function enrichGapsWithOpenAI(input: {
  url: string;
  existing: CaptureEnrichment;
  pageTextSnippet?: string | null;
  imageUrl?: string | null;
}): Promise<AiEnrichmentResult> {
  const openai = getOpenAIClient();
  const provenance: Record<string, ProvenanceEntry> = {};
  if (!openai) {
    return {
      patch: {},
      provenance,
      usage: {
        model: "none",
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        at: new Date().toISOString(),
      },
      skipped: true,
      reason: "openai_unavailable",
    };
  }

  const model = process.env.CAPTURE_ENRICHMENT_AI_MODEL || "gpt-4o-mini";
  const e = input.existing;
  const missing: string[] = [];
  if (!e.title) missing.push("title");
  if (!e.brand) missing.push("brand");
  if (!e.category) missing.push("category");
  if (!e.color) missing.push("color");
  if (!e.silhouette) missing.push("silhouette");
  if (!e.fit) missing.push("fit");
  if (!e.pattern) missing.push("pattern");
  if (!(e.distinctiveDetails?.length > 0)) missing.push("distinctiveDetails");
  if (!e.compositionText) missing.push("compositionText");
  if (e.price == null) missing.push("price");
  if (!e.imageUrl && !input.imageUrl) missing.push("imageUrl");

  if (missing.length === 0) {
    return {
      patch: {},
      provenance,
      usage: {
        model,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        at: new Date().toISOString(),
      },
      skipped: true,
      reason: "no_gaps",
    };
  }

  const system = `You enrich fashion product inspirations for INTERTEXE TX Match.
Return ONLY valid JSON with keys:
{"title":string|null,"brand":string|null,"price":number|null,"currency":string|null,
"category":string|null,"subcategory":string|null,"color":string|null,"pattern":string|null,
"silhouette":string|null,"fit":string|null,"length":string|null,
"distinctiveDetails":string[],"compositionText":string|null,
"occasion":string|null,"imageUrl":string|null,
"mustMatch":string[],"preferred":string[],"flexible":string[]}

Rules:
- Prefer English fashion retail terms.
- category should be one of: tops, dresses, skirts, trousers, pants, outerwear, knitwear, shoes, bags, jumpsuits, shorts, other.
- compositionText: fill whenever material is clear from the title, product name, visible image, or page text.
  Examples: "Leather jacket" → "Leather"; "Cashmere sweater" → "Cashmere"; "100% cotton" stays as stated.
  Prefer retailer wording with percentages when present. If only the fiber/material is clear (leather, shearling, silk, cashmere, linen, wool, cotton), return that material without inventing fake percentages.
- Do NOT invent precise blends (e.g. "70% wool / 30% silk") unless stated.
- Do not claim the original brand is inferior.
- distinctiveDetails: short concrete cues (print, hardware, neckline, hem).
- imageUrl: only a direct product image URL (jpg/png/webp/cdn), never a product page HTML URL.`;

  const userParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `URL: ${input.url}
Known (do not contradict): ${JSON.stringify({
        title: e.title,
        brand: e.brand,
        price: e.price,
        currency: e.currency,
        category: e.category,
        color: e.color,
        silhouette: e.silhouette,
        compositionText: e.compositionText,
      })}
Missing fields to fill if possible: ${missing.join(", ")}
Page context (may be truncated/empty):
${(input.pageTextSnippet || "").slice(0, 6000)}`,
    },
  ];

  const image = input.imageUrl || e.imageUrl;
  if (
    image &&
    /^https?:\/\//i.test(image) &&
    !/\.(html?|php|aspx?)(?:$|\?)/i.test(image) &&
    !/\/(products?|shop\/product)\//i.test(image)
  ) {
    userParts.push({
      type: "image_url",
      image_url: { url: image, detail: "low" },
    });
  }

  const res = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userParts },
    ],
    max_tokens: 700,
    temperature: 0.2,
  }).catch((err: any) => {
    console.error("[enrichGapsWithOpenAI] request failed", err?.message || err);
    return null;
  });

  if (!res) {
    return {
      patch: {},
      provenance,
      usage: {
        model,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        at: new Date().toISOString(),
      },
      skipped: true,
      reason: "openai_request_failed",
    };
  }

  const usage: AiEnrichmentUsage = {
    model,
    promptTokens: res.usage?.prompt_tokens ?? null,
    completionTokens: res.usage?.completion_tokens ?? null,
    totalTokens: res.usage?.total_tokens ?? null,
    at: new Date().toISOString(),
  };

  const raw =
    res.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() ||
    "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { patch: {}, provenance, usage, skipped: false, reason: "parse_failed" };
  }

  const patch: Partial<CaptureEnrichment> = {};
  const takeString = (key: keyof CaptureEnrichment, conf: number) => {
    if ((e as any)[key]) return;
    const v = parsed[key as string];
    if (typeof v === "string" && v.trim()) {
      (patch as any)[key] = v.trim();
      setProv(provenance, String(key), conf);
    }
  };

  takeString("title", 0.7);
  takeString("brand", 0.7);
  takeString("category", 0.65);
  takeString("subcategory", 0.6);
  takeString("color", 0.6);
  takeString("pattern", 0.55);
  takeString("silhouette", 0.6);
  takeString("fit", 0.55);
  takeString("length", 0.5);

  if (e.price == null && typeof parsed.price === "number" && parsed.price > 0) {
    patch.price = parsed.price;
    setProv(provenance, "price", 0.55);
  }
  if (!e.currency && typeof parsed.currency === "string") {
    patch.currency = String(parsed.currency).toUpperCase();
    setProv(provenance, "currency", 0.5);
  }
  if (!e.imageUrl && typeof parsed.imageUrl === "string" && /^https?:\/\//i.test(parsed.imageUrl)) {
    const candidate = parsed.imageUrl.trim();
    if (
      !/\.(html?|php)(?:$|\?)/i.test(candidate) &&
      !/\/shop\/product\//i.test(candidate)
    ) {
      patch.imageUrl = candidate;
      setProv(provenance, "imageUrl", 0.55);
    }
  }

  // Composition: accept stated % blends OR clear whole materials (leather, silk, etc.).
  if (!e.compositionText && typeof parsed.compositionText === "string") {
    const comp = parsed.compositionText.trim();
    const hasPercentBlend =
      /\d+(?:\.\d+)?%/.test(comp) &&
      /\b(cotton|wool|linen|silk|cashmere|viscose|polyester|polyamide|nylon|elastane|spandex|modal|lyocell|tencel|hemp|alpaca|merino|leather|shearling|suede|fur)\b/i.test(
        comp
      );
    const wholeMaterial =
      /^(?:100%\s+)?(leather|shearling|suede|silk|cashmere|linen|wool|cotton|merino|alpaca|hemp|viscose|tencel|lyocell)(?:\s*(?:&|and|,|with)\s*(?:leather|shearling|suede|silk|cashmere|linen|wool|cotton))?$/i.test(
        comp
      ) ||
      /^(leather|shearling|suede)(?:\s*(?:with|\/)\s*shearling(?:\s*trim)?)?$/i.test(comp);
    if (
      comp &&
      (hasPercentBlend || wholeMaterial) &&
      !/\b(guess|likely|probably|approx|maybe)\b/i.test(comp) &&
      comp.length < 140
    ) {
      patch.compositionText = comp;
      setProv(provenance, "compositionText", hasPercentBlend ? 0.5 : 0.42);
    }
  }

  // Title/image fallback: leather / shearling jackets when model returned null composition.
  if (!e.compositionText && !patch.compositionText) {
    const hay = `${e.title || ""} ${parsed.title || ""} ${(Array.isArray(parsed.distinctiveDetails) ? parsed.distinctiveDetails.join(" ") : "")}`.toLowerCase();
    if (/\bleather\b/.test(hay) && /\bshearling\b/.test(hay)) {
      patch.compositionText = "Leather with shearling trim";
      setProv(provenance, "compositionText", 0.4);
    } else if (/\bleather\b/.test(hay)) {
      patch.compositionText = "Leather";
      setProv(provenance, "compositionText", 0.4);
    } else if (/\bcashmere\b/.test(hay)) {
      patch.compositionText = "Cashmere";
      setProv(provenance, "compositionText", 0.4);
    } else if (/\bsilk\b/.test(hay)) {
      patch.compositionText = "Silk";
      setProv(provenance, "compositionText", 0.4);
    } else if (/\blinen\b/.test(hay)) {
      patch.compositionText = "Linen";
      setProv(provenance, "compositionText", 0.4);
    }
  }

  if (
    !(e.distinctiveDetails?.length > 0) &&
    Array.isArray(parsed.distinctiveDetails)
  ) {
    const details = parsed.distinctiveDetails
      .filter((d): d is string => typeof d === "string" && d.trim().length > 1)
      .map((d) => d.trim())
      .slice(0, 8);
    if (details.length) {
      patch.distinctiveDetails = details;
      setProv(provenance, "distinctiveDetails", 0.55);
    }
  }

  // Match brief cues — only fill if we gained attributes
  const mustMatch = Array.isArray(parsed.mustMatch)
    ? parsed.mustMatch.filter((x): x is string => typeof x === "string")
    : [];
  const preferred = Array.isArray(parsed.preferred)
    ? parsed.preferred.filter((x): x is string => typeof x === "string")
    : [];
  const flexible = Array.isArray(parsed.flexible)
    ? parsed.flexible.filter((x): x is string => typeof x === "string")
    : [];

  if (mustMatch.length || preferred.length || flexible.length) {
    const base = e.matchBrief;
    patch.matchBrief = {
      mustMatch: [...new Set([...(base?.mustMatch || []), ...mustMatch])].slice(0, 6),
      preferred: [...new Set([...(base?.preferred || []), ...preferred])].slice(0, 10),
      flexible: [...new Set([...(base?.flexible || []), ...flexible])].slice(0, 8),
      targetNaturalFiberImprovement: base?.targetNaturalFiberImprovement ?? true,
      targetPriceRange: base?.targetPriceRange ?? null,
      region: base?.region ?? "us",
    };
    setProv(provenance, "matchBrief", 0.5);
  }

  return { patch, provenance, usage, skipped: false };
}
