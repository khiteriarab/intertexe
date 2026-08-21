export type FiberFact = {
  fiber: string;
  headline: string;
  fact: string;
  traits: readonly [string, string, string];
};

export const fiberFacts: FiberFact[] = [
  {
    fiber: "Silk",
    headline: "Why silk drapes the way it does",
    fact: "A single silkworm cocoon can produce up to 1,600 meters of continuous filament — the longest natural fiber thread in the world. It is this extraordinary length that gives silk its signature fluid drape.",
    traits: ["FLUID DRAPE", "CONTINUOUS FILAMENT", "LUMINOUS"],
  },
  {
    fiber: "Cashmere",
    headline: "Why cashmere is so scarce",
    fact: "Cashmere comes from the soft undercoat of cashmere goats. Each goat produces only 150 to 200 grams of cashmere fiber per year — which is why a single cashmere sweater requires the annual yield of two to three goats.",
    traits: ["FINE MICRON", "INSULATING", "RARE YIELD"],
  },
  {
    fiber: "Linen",
    headline: "Why linen gets better with wear",
    fact: "Linen is made from the fibers of the flax plant and is one of the oldest textiles in the world — fragments have been found in Egyptian tombs dating to 36,000 BC. It gets softer and more lustrous with every wash.",
    traits: ["BREATHABLE", "STRONGER WET", "SOFTER WITH WEAR"],
  },
  {
    fiber: "Wool",
    headline: "Why wool regulates temperature",
    fact: "Wool fiber has a natural crimp that creates millions of tiny air pockets — which is why wool insulates in cold and regulates in heat. A wool garment can absorb up to 30% of its weight in moisture before feeling damp.",
    traits: ["THERMOREGULATING", "MOISTURE ABSORBING", "BREATHABLE"],
  },
  {
    fiber: "Cotton",
    headline: "Why the finest cotton feels different",
    fact: "Cotton is the most widely used natural fiber in the world. A single cotton boll contains around 500,000 fibers. The finest cotton — Egyptian Giza 45 — has a fiber length of 45 millimeters, giving it extraordinary softness.",
    traits: ["LONG STAPLE", "SOFT HAND", "BREATHABLE"],
  },
  {
    fiber: "Leather",
    headline: "Why full-grain leather lasts",
    fact: "Full-grain leather is the highest quality cut, taken from the outermost layer of the hide where the fibers are most densely packed. Unlike corrected-grain leather it is not sanded or buffed — meaning it retains the natural texture and develops a unique patina over time.",
    traits: ["DENSE FIBER", "UNBUFFED SURFACE", "PATINA"],
  },
  {
    fiber: "Silk",
    headline: "Why silk regulates temperature",
    fact: "Real silk has a natural temperature-regulating property — it is cool in summer and warm in winter. The simplest test for genuine silk is the burn test — it smells like burning hair and leaves a crushable ash. Polyester melts and leaves a hard plastic bead.",
    traits: ["TEMPERATURE REGULATING", "PROTEIN FIBER", "COOL / WARM"],
  },
  {
    fiber: "Cashmere",
    headline: "Why luxury cashmere is measured in microns",
    fact: "The finest cashmere comes from the Changthangi goat of the Ladakh region of India and the Changtang plateau of Tibet. The fiber diameter is measured in microns — luxury cashmere is typically 14 to 15.5 microns. Human hair is approximately 70 microns.",
    traits: ["14–15.5 MICRONS", "LIGHTWEIGHT WARMTH", "PLATEAU FIBER"],
  },
  {
    fiber: "Linen",
    headline: "Why linen outlasts synthetics",
    fact: "Linen is twice as strong as cotton and gets stronger when wet. A linen garment washed and worn for twenty years will be softer, more supple, and more beautiful than it was on the day it was purchased. No synthetic fiber does this.",
    traits: ["HIGH TENSILE", "STRONGER WET", "DECADES OF WEAR"],
  },
  {
    fiber: "Wool",
    headline: "Why merino can be worn against skin",
    fact: "Merino wool fibers are so fine — typically 15 to 24 microns — that they bend rather than prick the skin. This is why merino can be worn directly against skin unlike coarser wool. The finest merino is comparable in softness to cashmere.",
    traits: ["FINE MICRON", "NEXT-TO-SKIN", "CRIMP INSULATION"],
  },
  {
    fiber: "Cotton",
    headline: "Why extra-long staple cotton matters",
    fact: "Pima cotton, grown primarily in Peru, the American Southwest, and Australia, has extra-long staple fibers that create fabric with exceptional softness, strength, and resistance to pilling. It is to cotton what cashmere is to wool.",
    traits: ["EXTRA-LONG STAPLE", "LOW PILLING", "SOFT HAND"],
  },
  {
    fiber: "Silk",
    headline: "Why silk is a continuous filament",
    fact: "Silk is the only natural fiber produced by an insect. The silkworm Bombyx mori spins its cocoon from a single continuous thread of raw silk — a process that takes three to eight days and produces the entire filament in one unbroken length.",
    traits: ["INSECT FILAMENT", "UNBROKEN LENGTH", "PROTEIN FIBER"],
  },
];

export function getFiberFactForWeek(weekNumber: number) {
  return fiberFacts[weekNumber % fiberFacts.length];
}
