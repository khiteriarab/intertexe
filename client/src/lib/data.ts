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
  },
  {
    id: 'm2', name: 'Silk', slug: 'silk', category: 'animal',
    origin: 'Produced by the Bombyx mori silkworm, silk production (sericulture) originated in ancient China around 3,500 BCE.',
    description: 'The queen of natural fibers. Silk\'s natural shimmer, temperature-regulating properties, and luxurious drape have made it a symbol of elegance for millennia. Mulberry silk is the finest grade available.',
    characteristics: ['Natural sheen', 'Temperature-regulating', 'Strong for its weight', 'Smooth drape', 'Naturally hypoallergenic'],
    careInstructions: ['Dry clean recommended', 'Hand wash in cold water', 'Never wring or twist', 'Air dry away from sunlight'],
    sustainability: 'Peace silk (Ahimsa silk) allows the moth to emerge naturally before harvesting the cocoon.',
    searchKeywords: ['silk', 'mulberry silk', 'charmeuse', 'habotai', 'dupioni'],
  },
  {
    id: 'm3', name: 'Linen', slug: 'linen', category: 'plant',
    origin: 'Made from the flax plant (Linum usitatissimum), linen is one of the oldest textiles, used since 8,000 BCE in the ancient Fertile Crescent.',
    description: 'The ultimate warm-weather fabric. Linen gets softer with every wash, has exceptional breathability, and develops a coveted lived-in patina over time. Belgian and Irish linen are considered the gold standard.',
    characteristics: ['Extremely breathable', 'Gets softer with age', 'Absorbent', 'Naturally antibacterial', 'Thermo-regulating', 'Signature crease'],
    careInstructions: ['Machine wash cold or warm', 'Tumble dry low', 'Iron while damp', 'Embrace the natural wrinkle'],
    sustainability: 'Flax requires minimal water and pesticides. European flax is typically rain-fed, making it one of the most eco-friendly fibers.',
    searchKeywords: ['linen', 'flax', 'belgian linen', 'irish linen'],
  },
  {
    id: 'm4', name: 'Wool', slug: 'wool', category: 'animal',
    origin: 'Sheared from sheep, wool production has been central to textile history since 10,000 BCE. Merino sheep produce the finest grade.',
    description: 'Nature\'s performance fiber. Wool is naturally temperature-regulating, moisture-wicking, odor-resistant, and wrinkle-resistant. Super 100s–200s Merino wool offers the finest hand-feel in tailoring.',
    characteristics: ['Temperature-regulating', 'Moisture-wicking', 'Odor-resistant', 'Wrinkle-resistant', 'Flame-resistant', 'Elastic recovery'],
    careInstructions: ['Dry clean for structured garments', 'Hand wash in cold for knits', 'Lay flat to dry', 'Store with cedar to prevent moths'],
    sustainability: 'Wool is 100% biodegradable and renewable. Look for mulesing-free and responsibly-sourced certifications (RWS).',
    searchKeywords: ['wool', 'merino', 'lambswool', 'virgin wool', 'super 100s'],
  },
  {
    id: 'm5', name: 'Cashmere', slug: 'cashmere', category: 'animal',
    origin: 'Combed from the undercoat of cashmere goats in Mongolia, China, and the Kashmir region. Each goat produces only 150–200g per year.',
    description: 'The pinnacle of luxury knitwear. Cashmere is three times more insulating than sheep wool yet incredibly lightweight. Grade A cashmere features fibers just 14–15 microns in diameter.',
    characteristics: ['Exceptionally soft', 'Lightweight warmth', 'Three times warmer than wool', 'Elegant drape', 'Pills naturally with wear'],
    careInstructions: ['Hand wash in cool water', 'Use cashmere-specific detergent', 'Lay flat to dry', 'Fold, never hang', 'De-pill with cashmere comb'],
    sustainability: 'Overgrazing concerns in Mongolia. Look for brands sourcing from ethical cooperatives with sustainable herding practices.',
    searchKeywords: ['cashmere', 'kashmir', 'pashmina', 'grade a cashmere'],
  },
  {
    id: 'm6', name: 'Leather', slug: 'leather', category: 'animal',
    origin: 'One of humanity\'s oldest materials, tanned from animal hides. Italian vegetable-tanned leather from Tuscany is the benchmark for quality.',
    description: 'A material that improves with age. Full-grain leather develops a rich patina over years of use. The tanning method — vegetable vs. chrome — dramatically affects quality, feel, and longevity.',
    characteristics: ['Develops patina with age', 'Extremely durable', 'Naturally water-resistant', 'Breathable', 'Molds to shape'],
    careInstructions: ['Condition regularly', 'Store on padded hangers', 'Avoid prolonged sun exposure', 'Clean with specialized products'],
    sustainability: 'Vegetable tanning uses natural tannins vs. chrome chemicals. Look for LWG (Leather Working Group) certification.',
    searchKeywords: ['leather', 'suede', 'nubuck', 'full grain', 'vegetable tanned'],
  },
  {
    id: 'm7', name: 'Denim', slug: 'denim', category: 'plant',
    origin: 'Originally from Nîmes, France ("de Nîmes"). Traditional selvedge denim is woven on vintage shuttle looms in Japan, the USA, and Italy.',
    description: 'Cotton\'s most iconic form. Raw selvedge denim tells a unique story through its wear patterns and fading. Japanese mills like Kuroki and Kaihara produce some of the world\'s finest denim fabrics.',
    characteristics: ['Durable and long-lasting', 'Fades uniquely to wearer', 'Versatile weight range', 'Structured or soft hand-feel', 'Timeless aesthetic'],
    careInstructions: ['Wash infrequently', 'Cold wash inside out', 'Air dry for best results', 'Raw denim: wait 6+ months before first wash'],
    sustainability: 'Look for organic cotton denim with natural indigo dye. Some mills use ozone washing to reduce water usage by 90%.',
    searchKeywords: ['denim', 'selvedge', 'raw denim', 'japanese denim', 'indigo'],
  },
  {
    id: 'm8', name: 'Tencel / Modal', slug: 'tencel-modal', category: 'synthetic',
    origin: 'Semi-synthetic fibers made from sustainably-sourced wood pulp (eucalyptus for Tencel/Lyocell, beech for Modal) using closed-loop production.',
    description: 'The bridge between natural and synthetic. Tencel (Lyocell) and Modal offer silk-like softness with excellent moisture management. LENZING™ is the gold-standard producer with near-zero waste processes.',
    characteristics: ['Silky smooth texture', 'Excellent moisture management', 'Biodegradable', 'Drapes beautifully', 'Resistant to wrinkles'],
    careInstructions: ['Machine wash cold', 'Tumble dry low', 'Iron on low heat if needed', 'Retains shape well'],
    sustainability: 'Closed-loop production recycles 99% of solvents. FSC-certified wood sources. One of the most sustainable manufactured fibers.',
    searchKeywords: ['tencel', 'lyocell', 'modal', 'lenzing', 'eucalyptus fiber'],
  },
  {
    id: 'm9', name: 'Viscose / Rayon', slug: 'viscose-rayon', category: 'synthetic',
    origin: 'First developed in the 1880s as "artificial silk," viscose is made from dissolved wood cellulose, typically from bamboo, pine, or beech.',
    description: 'A versatile semi-synthetic with the drape of silk at a fraction of the cost. Quality varies widely — premium viscose (cupro, Bemberg) rivals natural fibers, while lower grades lack durability.',
    characteristics: ['Silk-like drape', 'Breathable', 'Takes dye vibrantly', 'Comfortable against skin', 'Can be delicate when wet'],
    careInstructions: ['Check garment label carefully', 'Hand wash or dry clean', 'Do not wring', 'Iron on low while slightly damp'],
    sustainability: 'Environmental impact depends heavily on production method. ECOVERO™ viscose uses sustainably-sourced wood and eco-responsible production.',
    searchKeywords: ['viscose', 'rayon', 'cupro', 'bemberg', 'bamboo viscose'],
  },
  {
    id: 'm10', name: 'Alpaca', slug: 'alpaca', category: 'animal',
    origin: 'Sheared from alpacas native to the Peruvian Andes, where indigenous communities have bred them for over 5,000 years. Baby alpaca is the finest grade.',
    description: 'Warmer than wool with a luxurious halo effect. Alpaca fiber is naturally hypoallergenic (no lanolin), comes in 22 natural colors, and is remarkably lightweight for its warmth.',
    characteristics: ['Warmer than merino wool', 'Hypoallergenic (no lanolin)', 'Naturally water-resistant', '22 natural colors', 'Lightweight', 'Minimal pilling'],
    careInstructions: ['Hand wash in cool water', 'Lay flat to dry', 'Store folded', 'Gentle detergent only'],
    sustainability: 'Alpacas have soft padded feet (minimal land damage) and efficient digestion. They require less water and food than sheep.',
    searchKeywords: ['alpaca', 'baby alpaca', 'suri alpaca', 'huacaya', 'peruvian alpaca'],
  },
];
