/**
 * Weekly Edit editorial engine.
 *
 * Formula: seasonal shopping moment + curated products + material intelligence
 * + shoppable material CTA.
 *
 * Material Intelligence is driven by the calendar (what a luxury shopper should
 * buy now), then refined by the merchandising theme and fibers actually present
 * in the catalog sample. It does not rotate evergreen trivia by week number.
 */

import { collectionEditTitle, collectionImageUrl } from "./weekly-edit-presentation";

export type FiberFact = {
  fiber: string;
  headline: string;
  fact: string;
  traits: readonly [string, string, string];
};

export type ShoppingMomentId = "first-fall" | "coats" | "holiday" | "spring" | "summer";

type MonthDay = readonly [month: number, day: number];

export type MaterialBrief = {
  fiber: string;
  headline: string;
  traits: readonly [string, string, string];
  fact: string;
};

export type ShoppingMoment = {
  id: ShoppingMomentId;
  /** Inclusive UTC month/day windows. A window may wrap the year (holiday). */
  windows: Array<{ start: MonthDay; end: MonthDay }>;
  name: string;
  subline: string;
  url: string;
  preferredFibers: string[];
  briefs: MaterialBrief[];
};

const SITE = "https://www.intertexe.com";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const FIBER_KEYS = ["cashmere", "wool", "silk", "linen", "cotton", "leather"] as const;

export const SHOPPING_MOMENTS: ShoppingMoment[] = [
  {
    id: "first-fall",
    windows: [{ start: [8, 15], end: [9, 30] }],
    name: "The First Fall Edit",
    subline: "Cashmere, lightweight knits and transitional pieces worth buying now.",
    url: `${SITE}/shop?fiber=cashmere`,
    preferredFibers: ["Cashmere", "Wool", "Silk"],
    briefs: [
      {
        fiber: "Cashmere",
        headline: "Cashmere season starts now.",
        traits: ["SOFTNESS", "WARMTH", "FIBER QUALITY"],
        fact: "Not all cashmere is created equal. As the first fall knits arrive, look beyond the label. Fiber quality, construction and composition can make the difference between a sweater you keep for years and one that pills after a season.",
      },
      {
        fiber: "Wool",
        headline: "Start with a knit you will actually wear.",
        traits: ["LIGHTWEIGHT WARMTH", "LAYERABLE", "FIBER QUALITY"],
        fact: "The first knit of fall should be light enough for now and warm enough for October. Fine wool and merino do that. Check the composition — a sweater that is mostly acrylic will pill before the season is over.",
      },
      {
        fiber: "Silk",
        headline: "Silk is how summer becomes fall.",
        traits: ["TRANSITIONAL", "DRAPE", "LAYERS WELL"],
        fact: "A silk shirt or dress is the piece that still works when evenings cool. Look at composition and weight — real silk layers under a knit; a synthetic satin will not.",
      },
    ],
  },
  {
    id: "coats",
    windows: [{ start: [10, 1], end: [11, 20] }],
    name: "The Coat Edit",
    subline: "Wool coats, heavier knits and the pieces that carry winter.",
    url: `${SITE}/shop?fiber=wool`,
    preferredFibers: ["Wool", "Cashmere", "Leather"],
    briefs: [
      {
        fiber: "Wool",
        headline: "Coat season is here.",
        traits: ["STRUCTURE", "WARMTH", "LONGEVITY"],
        fact: "A wool coat should carry more than one winter. Look at composition and construction — dense wool, a proper lining, and a cut you will still want in three years.",
      },
      {
        fiber: "Cashmere",
        headline: "This is when cashmere should feel substantial.",
        traits: ["WARMTH", "SOFTNESS", "FIBER QUALITY"],
        fact: "Heavier knits belong now. Look beyond the cashmere label to ply, micron and composition — that is the difference between a sweater that holds its shape and one that pills by January.",
      },
      {
        fiber: "Leather",
        headline: "Leather is the other winter investment.",
        traits: ["FULL GRAIN", "PATINA", "LONGEVITY"],
        fact: "A leather jacket or boot earns its place when the weather turns. Full-grain and honest composition last; coated finishes will not develop the patina that makes the piece better with wear.",
      },
    ],
  },
  {
    id: "holiday",
    windows: [{ start: [11, 21], end: [1, 6] }],
    name: "The Holiday Edit",
    subline: "Silk, velvet and occasion pieces for the nights that matter.",
    url: `${SITE}/collections/evening`,
    preferredFibers: ["Silk", "Wool", "Cashmere"],
    briefs: [
      {
        fiber: "Silk",
        headline: "Evening starts with the fiber.",
        traits: ["DRAPE", "LUSTER", "OCCASION"],
        fact: "Holiday dressing is when silk earns its place. Real filament silk is what gives a dress its light and movement. Velvet belongs here too — but only when the composition is honest.",
      },
      {
        fiber: "Wool",
        headline: "Occasion tailoring should feel like wool.",
        traits: ["CRÊPE", "STRUCTURE", "EVENING"],
        fact: "A wool crêpe dress or jacket is the quieter way to dress for night. Look for a high wool content — it holds shape through dinner in a way synthetics do not.",
      },
      {
        fiber: "Cashmere",
        headline: "The gift that should last longer than the season.",
        traits: ["SOFTNESS", "WARMTH", "FIBER QUALITY"],
        fact: "Cashmere is the holiday knit people actually keep. Read the composition: ply and fiber quality decide whether it is a gift for years, or something that pills by February.",
      },
    ],
  },
  {
    id: "spring",
    windows: [{ start: [1, 7], end: [5, 14] }],
    name: "The Spring Edit",
    subline: "Cotton, silk and transitional pieces as the wardrobe gets lighter.",
    url: `${SITE}/shop?fiber=cotton`,
    preferredFibers: ["Cotton", "Silk", "Linen"],
    briefs: [
      {
        fiber: "Cotton",
        headline: "The wardrobe is getting lighter.",
        traits: ["BREATHABLE", "TRANSITIONAL", "NATURAL FIBER"],
        fact: "Spring shopping is about pieces that work on cool mornings and warmer afternoons. Long-staple cotton does that without looking like vacation clothes worn too early.",
      },
      {
        fiber: "Silk",
        headline: "Silk is the spring layer that still looks finished.",
        traits: ["DRAPE", "LIGHT", "TRANSITIONAL"],
        fact: "A silk shirt or dress carries spring without waiting for heat. Look at composition — real silk has the drape; a satin-look blend will not.",
      },
      {
        fiber: "Linen",
        headline: "Linen can arrive before the first heatwave.",
        traits: ["BREATHABLE", "MOVES WITH YOU", "GETS BETTER"],
        fact: "Late spring is when linen starts to make sense. Look for a high linen content — blends that are mostly synthetic will not cool the way the real fiber does.",
      },
    ],
  },
  {
    id: "summer",
    windows: [{ start: [5, 15], end: [8, 14] }],
    name: "Vacation",
    subline: "Last-minute pieces in linen, silk and cotton.",
    url: `${SITE}/collections/vacation`,
    preferredFibers: ["Linen", "Cotton", "Silk"],
    briefs: [
      {
        fiber: "Linen",
        headline: "Heat changes what is worth buying.",
        traits: ["BREATHABLE", "MOVES WITH YOU", "GETS BETTER"],
        fact: "Linen is the fabric that makes sense when the temperature does not. Look for a high linen content — a blend that is mostly synthetic will not cool the way the real fiber does.",
      },
      {
        fiber: "Cotton",
        headline: "Cotton is the everyday of a hot-weather wardrobe.",
        traits: ["BREATHABLE", "SOFT HAND", "NATURAL FIBER"],
        fact: "In heat, cotton only earns its place when the fiber is honest. Long-staple cotton stays cooler and lasts longer than a thin synthetic blend labeled as summer dressing.",
      },
      {
        fiber: "Silk",
        headline: "Silk is still the evening fabric in summer.",
        traits: ["DRAPE", "LIGHT", "EVENING"],
        fact: "Summer evenings are when silk should feel cool, not sticky. Real filament silk does that. A polyester satin will not, however much it resembles the real thing on a hanger.",
      },
    ],
  },
];

export type FiberHost = {
  composition?: string | null;
  name?: string | null;
  category?: string | null;
};

export type WeeklyEditEditorial = {
  moment: ShoppingMoment;
  fiberFact: FiberFact;
  collection: {
    name: string;
    url: string;
    subline: string;
    editTitle: string;
    imageUrl: string;
  };
};

export function weekNumberFromDate(date: Date): number {
  return Math.floor(date.getTime() / WEEK_MS);
}

export function dateFromWeekNumber(weekNumber: number): Date {
  return new Date(weekNumber * WEEK_MS);
}

function monthDayValue(month: number, day: number): number {
  return month * 100 + day;
}

function dateMonthDay(date: Date): number {
  return monthDayValue(date.getUTCMonth() + 1, date.getUTCDate());
}

function windowContains(md: number, start: MonthDay, end: MonthDay): boolean {
  const a = monthDayValue(start[0], start[1]);
  const b = monthDayValue(end[0], end[1]);
  if (a <= b) return md >= a && md <= b;
  return md >= a || md <= b;
}

export function shoppingMomentForDate(date: Date): ShoppingMoment {
  const md = dateMonthDay(date);
  const match = SHOPPING_MOMENTS.find((moment) =>
    moment.windows.some((window) => windowContains(md, window.start, window.end))
  );
  return match ?? SHOPPING_MOMENTS[SHOPPING_MOMENTS.length - 1]!;
}

function activeWindowStart(moment: ShoppingMoment, date: Date): Date {
  const md = dateMonthDay(date);
  const window = moment.windows.find((entry) => windowContains(md, entry.start, entry.end));
  const start = window?.start ?? moment.windows[0]!.start;
  const end = window?.end ?? moment.windows[0]!.end;
  const wraps = monthDayValue(start[0], start[1]) > monthDayValue(end[0], end[1]);
  const year = date.getUTCFullYear();
  if (wraps && md <= monthDayValue(end[0], end[1])) {
    return new Date(Date.UTC(year - 1, start[0] - 1, start[1]));
  }
  return new Date(Date.UTC(year, start[0] - 1, start[1]));
}

export function weeksIntoMoment(moment: ShoppingMoment, date: Date): number {
  const start = activeWindowStart(moment, date);
  const diff = date.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / WEEK_MS));
}

export function fibersPresentInProducts(products: FiberHost[]): Set<string> {
  const found = new Set<string>();
  for (const product of products) {
    const hay = `${product.composition || ""} ${product.name || ""} ${product.category || ""}`.toLowerCase();
    for (const fiber of FIBER_KEYS) {
      if (new RegExp(`\\b${fiber}\\b`, "i").test(hay)) found.add(fiber);
    }
    if (/\bmerino\b/.test(hay)) found.add("wool");
    if (/\bvelvet\b/.test(hay)) found.add("silk");
    if (/\bflax\b/.test(hay)) found.add("linen");
  }
  return found;
}

export function seasonalProductScore(product: FiberHost, preferFibers: string[]): number {
  const prefer = preferFibers.map((fiber) => fiber.toLowerCase());
  if (!prefer.length) return 0;
  const hay = `${product.composition || ""} ${product.name || ""} ${product.category || ""}`.toLowerCase();
  let score = 0;
  prefer.forEach((fiber, index) => {
    if (hay.includes(fiber)) score += (prefer.length - index) * 8;
  });
  if (/\b(knit|sweater|cardigan|coat|blazer|turtleneck|crewneck|pullover)\b/.test(hay)) {
    score += 4;
  }
  if (
    (prefer.includes("cashmere") || prefer.includes("wool")) &&
    /\b(boot|loafer|leather)\b/.test(hay)
  ) {
    score += 3;
  }
  if (
    (prefer.includes("cashmere") || prefer.includes("wool")) &&
    /\b(sandal|raffia|wedge)\b/.test(hay)
  ) {
    score -= 2;
  }
  if (prefer.includes("linen") && /\b(linen|raffia|sandal)\b/.test(hay)) score += 3;
  return score;
}

function selectBrief(
  moment: ShoppingMoment,
  date: Date,
  products?: FiberHost[]
): MaterialBrief {
  const weeksInto = weeksIntoMoment(moment, date);
  const lead = moment.briefs[0]!;
  if (weeksInto <= 1 || !products?.length) return lead;

  const present = fibersPresentInProducts(products);
  if (present.has(lead.fiber.toLowerCase())) return lead;

  const matching = moment.briefs.filter((brief) => present.has(brief.fiber.toLowerCase()));
  return matching[0] ?? lead;
}

export function resolveWeeklyEditEditorial(
  weekNumber: number,
  opts?: { date?: Date; products?: FiberHost[] }
): WeeklyEditEditorial {
  const date = opts?.date ?? dateFromWeekNumber(weekNumber);
  const moment = shoppingMomentForDate(date);
  const brief = selectBrief(moment, date, opts?.products);
  return {
    moment,
    fiberFact: {
      fiber: brief.fiber,
      headline: brief.headline,
      fact: brief.fact,
      traits: brief.traits,
    },
    collection: {
      name: moment.name,
      url: moment.url,
      subline: moment.subline,
      editTitle: collectionEditTitle(moment.name),
      imageUrl: collectionImageUrl(moment.name),
    },
  };
}
