export type FiberEducation = {
  title: string;
  paragraphs: string[];
};

export const FIBER_EDUCATION: Record<string, FiberEducation> = {
  silk: {
    title: "What makes silk exceptional",
    paragraphs: [
      "Silk is the only natural fiber produced by an insect. A single silkworm cocoon can yield up to 1,600 meters of continuous filament — the longest natural fiber thread in the world. It is this extraordinary length that gives silk its signature fluid drape.",
      "Genuine silk has a natural temperature-regulating property — it is cool in summer and warm in winter. It absorbs moisture without feeling damp. It is hypoallergenic and naturally resistant to mold and mildew.",
      "Quality silk is measured in momme weight. A momme is a unit of weight — the higher the momme the heavier and more durable the silk. Lightweight blouses typically use 8 to 12 momme. Quality dress fabric is 16 to 19 momme. Exceptional silk can reach 30 momme or above.",
      "The burn test is the most reliable way to identify real silk. Genuine silk burns slowly, smells like burning hair, and leaves a crushable ash. Polyester satin melts, smells like burning plastic, and leaves a hard bead.",
    ],
  },
  cashmere: {
    title: "What makes cashmere exceptional",
    paragraphs: [
      "Cashmere comes from the soft undercoat of cashmere goats, primarily raised in Mongolia and Inner Mongolia. Each goat produces only a few ounces per year, which is why authentic cashmere commands a premium.",
      "Grade A cashmere uses the longest, finest fibers (typically under 16 microns). Two-ply or higher construction adds durability and reduces pilling. Single-ply cashmere feels softer initially but wears faster.",
      "True cashmere is extraordinarily warm for its weight — up to eight times warmer than sheep's wool by weight. It should feel plush, not scratchy. If it feels rough against the neck, it may be a low-grade blend.",
      "Look for transparency on fiber percentage. A garment labeled \"cashmere\" with only 5–10% cashmere and the rest wool or synthetic is not the same product category as 100% Grade A cashmere.",
    ],
  },
  linen: {
    title: "What makes linen exceptional",
    paragraphs: [
      "Linen is made from the flax plant and is one of the oldest textiles in human history. European flax — Belgian, French, and Irish — is considered the gold standard for long staple length and evenness.",
      "Linen is exceptionally breathable and becomes softer with every wash. Its natural stiffness creates structure that cotton cannot replicate, which is why tailored linen pieces hold their shape beautifully.",
      "Quality linen should feel crisp and dry, not stiff or papery. Slub variations are normal and indicate natural fiber rather than synthetic imitation.",
      "When shopping, prefer \"100% linen\" or \"European flax\" on the label. Linen blends with high synthetic content lose the cooling property that makes linen worth the investment.",
    ],
  },
  wool: {
    title: "What makes wool exceptional",
    paragraphs: [
      "Wool is a protein fiber with natural crimp that traps air, providing insulation without bulk. Merino wool (under 20 microns) is fine enough to wear directly against skin; coarser wools are better for outer layers.",
      "Look for \"virgin wool,\" \"pure new wool,\" or \"extrafine merino\" on labels. Recycled wool can be excellent but may have shorter staple length and slightly less resilience.",
      "Wool is naturally odor-resistant and moisture-wicking — it can absorb up to 30% of its weight in moisture before feeling wet. This makes it ideal for transitional weather and travel.",
      "Avoid superwash wool if you prioritize environmental impact; the chlorination process strips scales for machine washability. Hand-wash or dry-clean traditional wool for longevity.",
    ],
  },
  cotton: {
    title: "What makes cotton exceptional",
    paragraphs: [
      "Cotton is a cellulose fiber valued for breathability, softness, and ease of care. Long-staple varieties — Pima, Supima, Egyptian, and Sea Island — produce finer, stronger yarns than standard upland cotton.",
      "Organic cotton reduces pesticide exposure in production but does not automatically mean higher staple length. Check both certification and composition percentage.",
      "High-quality cotton should feel smooth and substantial, not thin or papery. For shirting, look for two-ply construction; for denim, ring-spun cotton indicates tighter, more durable yarn.",
      "Be wary of \"cotton-rich\" marketing — many blended tees are majority polyester. For natural fiber benefits, aim for 95% cotton or higher in the pieces you wear closest to skin.",
    ],
  },
  leather: {
    title: "What makes leather exceptional",
    paragraphs: [
      "Leather and suede are natural hides tanned for durability. Full-grain leather retains the outer hide layer and develops a patina over time; top-grain is sanded and more uniform but less characterful.",
      "Lambskin and calfskin are prized for softness in luxury goods. Vegetable-tanned leather ages with warmth and use; chrome-tanned leather is more water-resistant but less eco-friendly in production.",
      "Genuine leather should have natural grain variation — perfectly uniform surfaces often indicate corrected grain or coated finishes. Suede should feel napped and consistent, not plastic.",
      "Check labels carefully: \"leather\" in footwear may mean leather upper with synthetic lining. For investment pieces, seek full-grain or top-grain with disclosed origin and tanning method where possible.",
    ],
  },
};
