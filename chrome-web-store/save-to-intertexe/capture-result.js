/**
 * Display formula shared with lib/composition-display.ts.
 * Popup and peek must not invent a second parser.
 */
(function (root) {
  const JOIN = "; ";
  const PCT_NOTE = "percentage not provided";
  const FIBER_RE =
    /\b(organic\s+|recycled\s+)?(cotton|algod[oó]n|algodon|denim|vaquero|wool|lana|linen|lino|silk|seda|cashmere|viscose|viscosa|polyester|poli[eé]ster|polyamide|poliamida|nylon|elastane|elastano|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro|triacetate|acetate)\b/gi;
  const SYNTHETIC = {
    viscose: 1,
    polyester: 1,
    polyamide: 1,
    nylon: 1,
    elastane: 1,
    spandex: 1,
    acrylic: 1,
    rayon: 1,
    acetate: 1,
    triacetate: 1,
  };

  function fiberKey(raw) {
    return String(raw || "")
      .toLowerCase()
      .replace(/spandex/g, "elastane")
      .replace(/flax/g, "linen")
      .replace(/merino/g, "wool")
      .replace(/[^a-z0-9]+/g, "");
  }

  function titleFiber(raw) {
    const t = String(raw || "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\bspandex\b/i, "elastane")
      .replace(/\bflax\b/i, "linen")
      .replace(/\balgod[oó]n\b/gi, "cotton")
      .replace(/\balgodon\b/gi, "cotton")
      .replace(/\bvaquero\b/gi, "cotton")
      .replace(/\bdenim\b/gi, "cotton")
      .replace(/\bseda\b/gi, "silk")
      .replace(/\blana\b/gi, "wool")
      .replace(/\blino\b/gi, "linen")
      .replace(/\belastano\b/gi, "elastane")
      .replace(/\bviscosa\b/gi, "viscose")
      .replace(/\bpoli[eé]ster\b/gi, "polyester")
      .replace(/\bpoliamida\b/gi, "polyamide");
    if (!t) return "";
    const source = t === t.toUpperCase() || t === t.toLowerCase() ? t.toLowerCase() : t;
    return source.replace(/(^|[\s/-])([a-z])/g, (_, prefix, ch) => prefix + ch.toUpperCase());
  }

  function splitShellAndLining(raw) {
    const t = String(raw || "").replace(/\s+/g, " ").trim();
    if (!t) return { shell: "", lining: null, lace: null };
    let rest = t;
    let lining = null;
    let lace = null;
    const laceHit = rest.match(/^(.*?)\s*[;,]\s*lace\s*[:–-]?\s*(.+)$/i);
    if (laceHit && laceHit[1].trim() && laceHit[2].trim()) {
      rest = laceHit[1].replace(/[;,/|]+$/g, "").trim();
      lace = laceHit[2].replace(/\blace\b/gi, "").replace(/^[:–-]\s*/, "").trim();
    }
    if (!lining) {
      const labeled = rest.match(/^(.*?)(?:\s*[;,/|]\s*|\s+)\blining\b\s*[:–-]?\s*(.+)$/i);
      if (labeled && labeled[1].trim() && labeled[2].trim()) {
        rest = labeled[1].replace(/[;,/|]+$/g, "").trim();
        lining = labeled[2].replace(/\blining\b/gi, "").trim();
      }
    }
    return { shell: rest, lining, lace };
  }

  function uniquePercentClauses(text) {
    const t = String(text || "").replace(/\s+/g, " ");
    if (!t) return [];
    const fiberAlt =
      "cotton|algod[oó]n|algodon|denim|vaquero|wool|lana|linen|lino|silk|seda|cashmere|viscose|viscosa|polyester|poli[eé]ster|polyamide|poliamida|nylon|elastane|elastano|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro|triacetate|acetate";
    const seen = new Set();
    const out = [];
    const push = (pctRaw, fiberRaw) => {
      const pct = String(pctRaw || "").replace(",", ".");
      const n = Number(pct);
      if (!Number.isFinite(n) || n <= 0 || n > 100) return;
      const name = titleFiber(fiberRaw);
      const key = fiberKey(name);
      if (!name || !key || seen.has(key)) return;
      seen.add(key);
      out.push(`${n}% ${name}`);
    };
    const pctFirst = new RegExp(
      `(\\d{1,3}(?:[.,]\\d+)?)\\s*%\\s*(?:(?:organic|recycled|premium|stretch|pure|extra|fine)\\s+)*(${fiberAlt})`,
      "gi"
    );
    const fiberFirst = new RegExp(
      `\\b(${fiberAlt})\\s*[:\\-–]?\\s*(\\d{1,3}(?:[.,]\\d+)?)\\s*%`,
      "gi"
    );
    const pctFirstHits = [...t.matchAll(pctFirst)];
    const fiberFirstHits = [...t.matchAll(fiberFirst)];
    if (fiberFirstHits.length > pctFirstHits.length) {
      for (const m of fiberFirstHits) push(m[2], m[1]);
    } else {
      for (const m of pctFirstHits) push(m[1], m[2]);
    }
    return out;
  }

  function uniqueNamedFibers(text) {
    const seen = new Set();
    const out = [];
    const re = new RegExp(FIBER_RE.source, "gi");
    let m;
    while ((m = re.exec(String(text || "")))) {
      const key = fiberKey(m[2] || m[0] || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(titleFiber(m[2] || m[0] || ""));
    }
    return out;
  }

  function formatPart(text) {
    const percents = uniquePercentClauses(text);
    if (percents.length) {
      return { line: percents.join(JOIN), hasPercentages: true };
    }
    const fibers = uniqueNamedFibers(text);
    return { line: fibers.join(JOIN), hasPercentages: false };
  }

  function partHasSynthetic(text) {
    const lower = String(text || "").toLowerCase();
    return Object.keys(SYNTHETIC).some((f) => new RegExp(`\\b${f}\\b`).test(lower));
  }

  function formatCompositionDisplay(raw) {
    const empty = {
      headline: "Material details unavailable",
      materialLine: "Material details unavailable",
      hasPercentages: false,
      hasSyntheticLining: false,
      hasSyntheticLace: false,
    };
    const stripped = String(raw || "")
      .replace(/^\s*retailer lists:\s*/i, "")
      .replace(/^\s*material:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!stripped) return empty;
    const split = splitShellAndLining(stripped);
    const shellFmt = formatPart(split.shell);
    const liningFmt = split.lining ? formatPart(split.lining) : { line: "", hasPercentages: false };
    const laceFmt = split.lace ? formatPart(split.lace) : { line: "", hasPercentages: false };
    let core = shellFmt.line;
    if (core && !shellFmt.hasPercentages) core = `${core} — ${PCT_NOTE}`;
    if (!core) return empty;
    if (laceFmt.line) {
      core = `${core.replace(/ — percentage not provided$/, "")}${JOIN}lace: ${laceFmt.line}`;
    }
    if (liningFmt.line) {
      core = `${core.replace(/ — percentage not provided$/, "")}${JOIN}lining: ${liningFmt.line}`;
    }
    return {
      headline: core,
      materialLine: `Material: ${core}`,
      hasPercentages: shellFmt.hasPercentages,
      hasSyntheticLining: Boolean(split.lining && partHasSynthetic(split.lining)),
      hasSyntheticLace: Boolean(split.lace && partHasSynthetic(split.lace)),
    };
  }

  function formatPriceLabel(price, currency) {
    const num = typeof price === "string" ? parseFloat(price) : Number(price);
    if (!Number.isFinite(num) || num <= 0) return "Price unavailable";
    const cur = String(currency || "").trim().toUpperCase();
    try {
      return new Intl.NumberFormat(cur === "EUR" ? "en-IE" : cur === "GBP" ? "en-GB" : "en-US", {
        style: cur ? "currency" : "decimal",
        currency: cur || "USD",
        maximumFractionDigits: num % 1 === 0 ? 0 : 2,
      }).format(num);
    } catch {
      return String(num);
    }
  }

  function formatAltPriceLabel(price, currency, sourceCurrency) {
    const label = formatPriceLabel(price, currency);
    if (label === "Price unavailable") return { label, mixed: false };
    const mixed = Boolean(
      sourceCurrency && currency && String(sourceCurrency).toUpperCase() !== String(currency).toUpperCase()
    );
    return { label, mixed };
  }

  function unpublishedMaterialCopy(opts) {
    const listed = formatCompositionDisplay(opts?.compositionText || "");
    if (listed.headline !== "Material details unavailable") {
      return {
        headline: listed.headline.replace(/percentage not provided/gi, "exact percentage not provided"),
        detail: listed.hasSyntheticLace
          ? "Synthetic lace — not the same as a fully natural construction."
          : listed.hasSyntheticLining
          ? "Synthetic lining — not the same as a fully natural construction."
          : null,
        supporting: null,
        hasSyntheticLining: listed.hasSyntheticLining,
        hasSyntheticLace: listed.hasSyntheticLace,
      };
    }
    const hay = `${opts?.title || ""} ${opts?.category || ""} ${opts?.compositionText || ""}`;
    const alts = Number(opts?.altCount) || 0;
    if (/\b(jeans?|denim|vaquero)\b/i.test(hay)) {
      return {
        headline: "Denim detected",
        detail: "Exact composition not published",
        supporting:
          alts > 0
            ? "We found better-material alternatives in cotton."
            : "We'll look for better-material alternatives in cotton.",
        hasSyntheticLining: false,
        hasSyntheticLace: false,
      };
    }
    const fiberHit = hay.toLowerCase().match(
      /\b(silk|seda|cotton|wool|linen|cashmere|leather|suede|charmeuse|chiffon|satin)\b/
    );
    if (fiberHit) {
      let fiber = fiberHit[1].toLowerCase();
      if (fiber === "seda" || fiber === "charmeuse" || fiber === "chiffon" || fiber === "satin") fiber = "silk";
      if (fiber === "suede") fiber = "leather";
      const label = fiber.charAt(0).toUpperCase() + fiber.slice(1);
      return {
        headline: `${label} detected`,
        detail: "Exact composition not published",
        supporting:
          alts > 0
            ? `We found better-material alternatives in ${fiber}.`
            : `We'll look for better-material alternatives in ${fiber}.`,
        hasSyntheticLining: false,
        hasSyntheticLace: false,
      };
    }
    return {
      headline: "Exact composition not published",
      detail: "We'll still look for better-material alternatives from the product on this page.",
      supporting: null,
      hasSyntheticLining: false,
      hasSyntheticLace: false,
    };
  }

  root.ITXCaptureResult = {
    formatCompositionDisplay,
    formatPriceLabel,
    formatAltPriceLabel,
    unpublishedMaterialCopy,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
