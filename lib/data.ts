export interface Material {
  id: string;
  name: string;
  slug: string;
  category: 'plant' | 'animal' | 'synthetic';
  origin: string;
  description: string;
  characteristics: string[];
  careInstructions: string[];
  sustainability: string;
  searchKeywords: string[];
  buyingRules: {
    lookFor: string[];
    avoid: string[];
    redFlags: string[];
    priceGuidance: string;
  };
}

export const MATERIALS: Material[] = [
  {
    id: 'm1', name: 'Cotton', slug: 'cotton', category: 'plant',
    origin: 'Derived from the cotton plant (Gossypium), cultivated for over 7,000 years across tropical and subtropical regions.',
    description: 'The world\'s most versatile natural fiber. Prized for its breathability, softness, and ability to take dye beautifully. Egyptian and Pima cotton represent the pinnacle of quality with their extra-long staple fibers.',
    characteristics: ['Breathable', 'Absorbent', 'Soft hand-feel', 'Durable', 'Hypoallergenic', 'Easy to dye'],
    careInstructions: ['Machine wash warm', 'Tumble dry medium', 'Iron on medium-high heat', 'Can shrink on first wash'],
    sustainability: 'Organic cotton uses 91% less water than conventional. Look for GOTS-certified organic cotton.',
    searchKeywords: ['cotton', 'organic cotton', 'pima', 'egyptian cotton', 'supima'],
    buyingRules: {
      lookFor: ['100% cotton or cotton-dominant blends', 'Egyptian, Pima, or Supima cotton', 'GOTS-certified organic', 'Brushed or combed cotton for softness', 'High thread count in wovens'],
      avoid: ['Cotton/polyester blends marketed as "easy care"', 'Anything under 60% cotton content', 'Unbranded generic cotton with no origin stated'],
      redFlags: ['"Cotton-feel" or "cotton-touch" — means it\'s synthetic', '"Polycotton" — typically 65% polyester', 'No fabric composition on the label'],
      priceGuidance: 'A quality 100% cotton t-shirt should cost $40-120. Under $25 almost always means thin, short-staple cotton that pills quickly.',
    },
  },
  {
    id: 'm2', name: 'Silk', slug: 'silk', category: 'animal',
    origin: 'Produced by the Bombyx mori silkworm, silk production (sericulture) originated in ancient China around 3,500 BCE.',
    description: 'The queen of natural fibers. Silk\'s natural shimmer, temperature-regulating properties, and luxurious drape have made it a symbol of elegance for millennia. Mulberry silk is the finest grade available.',
    characteristics: ['Natural sheen', 'Temperature-regulating', 'Strong for its weight', 'Smooth drape', 'Naturally hypoallergenic'],
    careInstructions: ['Dry clean recommended', 'Hand wash in cold water', 'Never wring or twist', 'Air dry away from sunlight'],
    sustainability: 'Peace silk (Ahimsa silk) allows the moth to emerge naturally before harvesting the cocoon.',
    searchKeywords: ['silk', 'mulberry silk', 'charmeuse', 'habotai', 'dupioni'],
    buyingRules: {
      lookFor: ['100% mulberry silk', 'Momme weight listed (19-25mm is ideal for clothing)', 'Grade 6A silk (highest quality)', 'Charmeuse or crepe de chine for luxurious drape'],
      avoid: ['Silk blended with polyester', '"Silk-like" or "silky" fabrics — they\'re synthetic', 'Art silk (artificial silk) — it\'s viscose'],
      redFlags: ['"Satin" without specifying silk — satin is a weave, not a fiber', 'Unusually low prices for silk garments', 'Shiny but plasticky hand-feel'],
      priceGuidance: 'A quality silk blouse starts at $150+. Silk under $80 is likely low-momme weight or blended. A silk scarf should be $100+ for genuine quality.',
    },
  },
  {
    id: 'm3', name: 'Linen', slug: 'linen', category: 'plant',
    origin: 'Made from the flax plant (Linum usitatissimum), linen is one of the oldest textiles, used since 8,000 BCE in the ancient Fertile Crescent.',
    description: 'The ultimate warm-weather fabric. Linen gets softer with every wash, has exceptional breathability, and develops a coveted lived-in patina over time. Belgian and Irish linen are considered the gold standard.',
    characteristics: ['Extremely breathable', 'Gets softer with age', 'Absorbent', 'Naturally antibacterial', 'Thermo-regulating', 'Signature crease'],
    careInstructions: ['Machine wash cold or warm', 'Tumble dry low', 'Iron while damp', 'Embrace the natural wrinkle'],
    sustainability: 'Flax requires minimal water and pesticides. European flax is typically rain-fed, making it one of the most eco-friendly fibers.',
    searchKeywords: ['linen', 'flax', 'belgian linen', 'irish linen'],
    buyingRules: {
      lookFor: ['100% linen or linen-dominant blends', 'Belgian or Irish linen for top quality', 'European Flax certification', 'Heavier weight (170-250 GSM) for structure'],
      avoid: ['Linen/polyester blends — defeats the purpose', 'Over-processed linen that feels papery', '"Linen look" fabrics — always synthetic'],
      redFlags: ['Linen that doesn\'t wrinkle at all — it\'s treated with chemicals or blended', 'Very low prices — real linen is labor-intensive', '"Ramie" sold as linen — similar but inferior'],
      priceGuidance: 'A quality linen shirt starts at $80-150. Belgian linen pieces run $200+. If a "linen" dress is under $50, check the label carefully.',
    },
  },
  {
    id: 'm4', name: 'Wool', slug: 'wool', category: 'animal',
    origin: 'Sheared from sheep, wool production has been central to textile history since 10,000 BCE. Merino sheep produce the finest grade.',
    description: 'Nature\'s performance fiber. Wool is naturally temperature-regulating, moisture-wicking, odor-resistant, and wrinkle-resistant. Super 100s\u2013200s Merino wool offers the finest hand-feel in tailoring.',
    characteristics: ['Temperature-regulating', 'Moisture-wicking', 'Odor-resistant', 'Wrinkle-resistant', 'Flame-resistant', 'Elastic recovery'],
    careInstructions: ['Dry clean for structured garments', 'Hand wash in cold for knits', 'Lay flat to dry', 'Store with cedar to prevent moths'],
    sustainability: 'Wool is 100% biodegradable and renewable. Look for mulesing-free and responsibly-sourced certifications (RWS).',
    searchKeywords: ['wool', 'merino', 'lambswool', 'virgin wool', 'super 100s'],
    buyingRules: {
      lookFor: ['100% virgin wool or merino wool', 'Super 100s+ for suiting (higher = finer)', 'RWS (Responsible Wool Standard) certification', 'Italian or British milled wool for tailoring'],
      avoid: ['Wool/acrylic blends — acrylic pills and traps heat', '"Wool blend" without specifying percentages', 'Boiled wool mixed with synthetics'],
      redFlags: ['"Wool-feel" or "wool-touch" — it\'s acrylic', 'Wool suits under $300 — likely low super count or blended', 'Itchiness means coarse fiber (over 25 microns)'],
      priceGuidance: 'A quality wool sweater runs $150-400. Wool suiting starts at $500+ for decent quality. Merino base layers: $60-120.',
    },
  },
  {
    id: 'm5', name: 'Cashmere', slug: 'cashmere', category: 'animal',
    origin: 'Combed from the undercoat of cashmere goats in Mongolia, China, and the Kashmir region. Each goat produces only 150\u2013200g per year.',
    description: 'The pinnacle of luxury knitwear. Cashmere is three times more insulating than sheep wool yet incredibly lightweight. Grade A cashmere features fibers just 14\u201315 microns in diameter.',
    characteristics: ['Exceptionally soft', 'Lightweight warmth', 'Three times warmer than wool', 'Elegant drape', 'Pills naturally with wear'],
    careInstructions: ['Hand wash in cool water', 'Use cashmere-specific detergent', 'Lay flat to dry', 'Fold, never hang', 'De-pill with cashmere comb'],
    sustainability: 'Overgrazing concerns in Mongolia. Look for brands sourcing from ethical cooperatives with sustainable herding practices.',
    searchKeywords: ['cashmere', 'kashmir', 'pashmina', 'grade a cashmere'],
    buyingRules: {
      lookFor: ['100% cashmere (2-ply minimum for durability)', 'Grade A cashmere (14-15.5 microns)', 'Mongolian or Inner Mongolian origin', 'Dense, tight knit with no see-through'],
      avoid: ['Cashmere blended with nylon or acrylic', '"Cashmere-feel" products — they\'re synthetic', 'Single-ply cashmere — pills faster and wears thin'],
      redFlags: ['Cashmere sweater under $100 — almost certainly low-grade or blended', 'Scratchy hand-feel means coarse fibers (Grade C)', '"Pashmina" scarves under $80 — likely viscose'],
      priceGuidance: 'A quality 2-ply cashmere sweater costs $200-600. Exceptional pieces from Scottish or Italian mills run $400-1,200. Under $100 means compromised quality.',
    },
  },
  {
    id: 'm6', name: 'Leather', slug: 'leather', category: 'animal',
    origin: 'One of humanity\'s oldest materials, tanned from animal hides. Italian vegetable-tanned leather from Tuscany is the benchmark for quality.',
    description: 'A material that improves with age. Full-grain leather develops a rich patina over years of use. The tanning method \u2014 vegetable vs. chrome \u2014 dramatically affects quality, feel, and longevity.',
    characteristics: ['Develops patina with age', 'Extremely durable', 'Naturally water-resistant', 'Breathable', 'Molds to shape'],
    careInstructions: ['Condition regularly', 'Store on padded hangers', 'Avoid prolonged sun exposure', 'Clean with specialized products'],
    sustainability: 'Vegetable tanning uses natural tannins vs. chrome chemicals. Look for LWG (Leather Working Group) certification.',
    searchKeywords: ['leather', 'suede', 'nubuck', 'full grain', 'vegetable tanned'],
    buyingRules: {
      lookFor: ['Full-grain leather (not corrected or split)', 'Vegetable-tanned for bags and accessories', 'Italian or Japanese craftsmanship', 'Natural edge finishing (burnished, not painted)'],
      avoid: ['Bonded leather — it\'s shredded leather glued to fabric', '"Genuine leather" — it\'s the lowest quality grade of real leather', 'PU leather or "vegan leather" labeled as premium'],
      redFlags: ['"Genuine leather" stamp — counterintuitively, this is the worst real leather grade', 'Perfect uniform surface — means it\'s corrected grain (sanded and embossed)', 'Chemical smell — indicates heavy chrome tanning'],
      priceGuidance: 'A quality leather bag starts at $300-500. Full-grain leather jackets run $800-2,000+. Italian vegetable-tanned goods command a premium for good reason.',
    },
  },
  {
    id: 'm7', name: 'Denim', slug: 'denim', category: 'plant',
    origin: 'Originally from N\u00eemes, France ("de N\u00eemes"). Traditional selvedge denim is woven on vintage shuttle looms in Japan, the USA, and Italy.',
    description: 'Cotton\'s most iconic form. Raw selvedge denim tells a unique story through its wear patterns and fading. Japanese mills like Kuroki and Kaihara produce some of the world\'s finest denim fabrics.',
    characteristics: ['Durable and long-lasting', 'Fades uniquely to wearer', 'Versatile weight range', 'Structured or soft hand-feel', 'Timeless aesthetic'],
    careInstructions: ['Wash infrequently', 'Cold wash inside out', 'Air dry for best results', 'Raw denim: wait 6+ months before first wash'],
    sustainability: 'Look for organic cotton denim with natural indigo dye. Some mills use ozone washing to reduce water usage by 90%.',
    searchKeywords: ['denim', 'selvedge', 'raw denim', 'japanese denim', 'indigo'],
    buyingRules: {
      lookFor: ['100% cotton denim (or 98%+ with 2% elastane max)', 'Selvedge denim from Japanese or American mills', 'Weight specified in oz (12-14oz is versatile, 16oz+ for heavy-duty)', 'Natural indigo dye for authentic fading'],
      avoid: ['Denim with more than 5% elastane — loses shape quickly', '"Jeggings" or heavily-stretch denim for longevity', 'Pre-distressed denim — it\'s already weakened'],
      redFlags: ['No fabric composition listed', '"Stretch denim" without specifying elastane percentage', 'Very cheap jeans that claim to be selvedge'],
      priceGuidance: 'Quality selvedge denim jeans cost $150-350. Japanese denim runs $200-400. Fast-fashion jeans under $50 typically use inferior cotton and excess synthetics.',
    },
  },
  {
    id: 'm8', name: 'Tencel / Modal', slug: 'tencel-modal', category: 'synthetic',
    origin: 'Semi-synthetic fibers made from sustainably-sourced wood pulp (eucalyptus for Tencel/Lyocell, beech for Modal) using closed-loop production.',
    description: 'The bridge between natural and synthetic. Tencel (Lyocell) and Modal offer silk-like softness with excellent moisture management. LENZING\u2122 is the gold-standard producer with near-zero waste processes.',
    characteristics: ['Silky smooth texture', 'Excellent moisture management', 'Biodegradable', 'Drapes beautifully', 'Resistant to wrinkles'],
    careInstructions: ['Machine wash cold', 'Tumble dry low', 'Iron on low heat if needed', 'Retains shape well'],
    sustainability: 'Closed-loop production recycles 99% of solvents. FSC-certified wood sources. One of the most sustainable manufactured fibers.',
    searchKeywords: ['tencel', 'lyocell', 'modal', 'lenzing', 'eucalyptus fiber'],
    buyingRules: {
      lookFor: ['LENZING\u2122 branded Tencel or Modal', '100% Lyocell or high-percentage Lyocell blends', 'Blends with cotton or silk (not polyester)', 'FSC-certified sourcing'],
      avoid: ['Generic "lyocell" without LENZING branding — quality varies', 'Tencel/polyester blends — defeats the sustainability purpose', 'Cheap modal that pills quickly'],
      redFlags: ['"Eco-friendly" modal without certification', 'Very thin modal t-shirts that become transparent after washing', 'Modal blended with more than 30% synthetics'],
      priceGuidance: 'A quality Tencel top runs $50-150. Modal basics cost $30-80. LENZING-certified pieces command a slight premium over generic versions.',
    },
  },
  {
    id: 'm9', name: 'Viscose / Rayon', slug: 'viscose-rayon', category: 'synthetic',
    origin: 'First developed in the 1880s as "artificial silk," viscose is made from dissolved wood cellulose, typically from bamboo, pine, or beech.',
    description: 'A versatile semi-synthetic with the drape of silk at a fraction of the cost. Quality varies widely \u2014 premium viscose (cupro, Bemberg) rivals natural fibers, while lower grades lack durability.',
    characteristics: ['Silk-like drape', 'Breathable', 'Takes dye vibrantly', 'Comfortable against skin', 'Can be delicate when wet'],
    careInstructions: ['Check garment label carefully', 'Hand wash or dry clean', 'Do not wring', 'Iron on low while slightly damp'],
    sustainability: 'Environmental impact depends heavily on production method. ECOVERO\u2122 viscose uses sustainably-sourced wood and eco-responsible production.',
    searchKeywords: ['viscose', 'rayon', 'cupro', 'bemberg', 'bamboo viscose'],
    buyingRules: {
      lookFor: ['ECOVERO\u2122 certified viscose', 'Cupro (Bemberg) for the highest quality', 'Viscose blended with cotton or linen', 'Heavier weight viscose for better drape and durability'],
      avoid: ['100% viscose in structured garments — it doesn\'t hold shape', 'Very cheap viscose dresses — they shrink and warp', '"Bamboo" fabric without rayon/viscose disclosure'],
      redFlags: ['"Bamboo fiber" is almost always bamboo viscose — same chemical process', 'Viscose that wrinkles severely after one wear', 'Paper-thin viscose that becomes see-through'],
      priceGuidance: 'Quality viscose pieces cost $60-200. Cupro/Bemberg pieces run $150-400. Budget viscose under $30 rarely survives more than a season.',
    },
  },
  {
    id: 'm10', name: 'Alpaca', slug: 'alpaca', category: 'animal',
    origin: 'Sheared from alpacas native to the Peruvian Andes, where indigenous communities have bred them for over 5,000 years. Baby alpaca is the finest grade.',
    description: 'Warmer than wool with a luxurious halo effect. Alpaca fiber is naturally hypoallergenic (no lanolin), comes in 22 natural colors, and is remarkably lightweight for its warmth.',
    characteristics: ['Warmer than merino wool', 'Hypoallergenic (no lanolin)', 'Naturally water-resistant', '22 natural colors', 'Lightweight', 'Minimal pilling'],
    careInstructions: ['Hand wash in cool water', 'Lay flat to dry', 'Store folded', 'Gentle detergent only'],
    sustainability: 'Alpacas have soft padded feet (minimal land damage) and efficient digestion. They require less water and food than sheep.',
    searchKeywords: ['alpaca', 'baby alpaca', 'suri alpaca', 'huacaya', 'peruvian alpaca'],
    buyingRules: {
      lookFor: ['100% baby alpaca for finest quality', 'Peruvian origin (traditional expertise)', 'Natural undyed colors for authenticity', 'Dense knit with good weight'],
      avoid: ['Alpaca blended with acrylic — common in tourist goods', '"Alpaca blend" without percentage specified', 'Machine-knit pieces sold at handmade prices'],
      redFlags: ['Alpaca sweater under $80 — likely blended or very coarse fiber', '"Alpaca wool" is misleading — alpaca is not sheep wool', 'Very uniform texture may indicate machine processing of lower grades'],
      priceGuidance: 'Quality baby alpaca sweaters cost $200-500. Suri alpaca (rarer, silkier) runs $300-700. Peruvian artisan pieces are worth the investment.',
    },
  },
];
