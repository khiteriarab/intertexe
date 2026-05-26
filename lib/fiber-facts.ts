export const fiberFacts = [
  {
    fiber: "Silk",
    fact: "A single silkworm cocoon can produce up to 1,600 meters of continuous filament — the longest natural fiber thread in the world. It is this extraordinary length that gives silk its signature fluid drape.",
  },
  {
    fiber: "Cashmere",
    fact: "Cashmere comes from the soft undercoat of cashmere goats. Each goat produces only 150 to 200 grams of cashmere fiber per year — which is why a single cashmere sweater requires the annual yield of two to three goats.",
  },
  {
    fiber: "Linen",
    fact: "Linen is made from the fibers of the flax plant and is one of the oldest textiles in the world — fragments have been found in Egyptian tombs dating to 36,000 BC. It gets softer and more lustrous with every wash.",
  },
  {
    fiber: "Wool",
    fact: "Wool fiber has a natural crimp that creates millions of tiny air pockets — which is why wool insulates in cold and regulates in heat. A wool garment can absorb up to 30% of its weight in moisture before feeling damp.",
  },
  {
    fiber: "Cotton",
    fact: "Cotton is the most widely used natural fiber in the world. A single cotton boll contains around 500,000 fibers. The finest cotton — Egyptian Giza 45 — has a fiber length of 45 millimeters, giving it extraordinary softness.",
  },
  {
    fiber: "Leather",
    fact: "Full-grain leather is the highest quality cut, taken from the outermost layer of the hide where the fibers are most densely packed. Unlike corrected-grain leather it is not sanded or buffed — meaning it retains the natural texture and develops a unique patina over time.",
  },
  {
    fiber: "Silk",
    fact: "Real silk has a natural temperature-regulating property — it is cool in summer and warm in winter. The simplest test for genuine silk is the burn test — it smells like burning hair and leaves a crushable ash. Polyester melts and leaves a hard plastic bead.",
  },
  {
    fiber: "Cashmere",
    fact: "The finest cashmere comes from the Changthangi goat of the Ladakh region of India and the Changtang plateau of Tibet. The fiber diameter is measured in microns — luxury cashmere is typically 14 to 15.5 microns. Human hair is approximately 70 microns.",
  },
  {
    fiber: "Linen",
    fact: "Linen is twice as strong as cotton and gets stronger when wet. A linen garment washed and worn for twenty years will be softer, more supple, and more beautiful than it was on the day it was purchased. No synthetic fiber does this.",
  },
  {
    fiber: "Wool",
    fact: "Merino wool fibers are so fine — typically 15 to 24 microns — that they bend rather than prick the skin. This is why merino can be worn directly against skin unlike coarser wool. The finest merino is comparable in softness to cashmere.",
  },
  {
    fiber: "Cotton",
    fact: "Pima cotton, grown primarily in Peru, the American Southwest, and Australia, has extra-long staple fibers that create fabric with exceptional softness, strength, and resistance to pilling. It is to cotton what cashmere is to wool.",
  },
  {
    fiber: "Silk",
    fact: "Silk is the only natural fiber produced by an insect. The silkworm Bombyx mori spins its cocoon from a single continuous thread of raw silk — a process that takes three to eight days and produces the entire filament in one unbroken length.",
  },
];

export function getFiberFactForWeek(weekNumber: number) {
  return fiberFacts[weekNumber % fiberFacts.length];
}
