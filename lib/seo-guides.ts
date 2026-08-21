export type GuideStatus = "indexable" | "scheduled";

export type GuidePage = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  lastReviewed: string;
  status: GuideStatus;
  publishAfter: string;
  intro: string[];
  qualifies: string;
  whyMaterial: string;
  inspect: string[];
  priceContext: string;
  howSelected: string;
  related: Array<{ href: string; label: string }>;
  fiber?: string;
  category?: string;
};

/**
 * Editorially approved hubs only. Do not generate arbitrary material×category
 * combinations from the catalog.
 */
export const GUIDE_PAGES: GuidePage[] = [
  {
    slug: "fall-2026-materials",
    title: "Fall 2026 Material Guide",
    h1: "Fall 2026 materials: what to look for before you buy",
    description:
      "A practical INTERTEXE guide to wool, cashmere, silk, cotton, and linen for fall dressing — composition first, trend second.",
    lastReviewed: "2026-08-18",
    status: "indexable",
    publishAfter: "2026-08-01",
    intro: [
      "Fall shopping is when fabric quality becomes obvious. A coat that looks substantial in a photo can still be mostly polyester. A sweater that feels expensive in the fitting room can pill in two wears.",
      "INTERTEXE is a fashion discovery and material-intelligence platform. We do not sell the garments. We verify composition so you can compare material quality with price before you click through to a retailer.",
    ],
    qualifies:
      "Pieces in this guide are linked from INTERTEXE material hubs that already require verified composition. We do not invent fiber percentages.",
    whyMaterial:
      "Cooler weather rewards fibers that insulate, drape, and last: wool and cashmere for warmth, silk for evening, cotton and linen for the weeks that are still mild.",
    inspect: [
      "Read the full composition, not the marketing fabric story.",
      "Check whether the shell, lining, and trim are listed separately.",
      "Treat 'wool blend' without percentages as incomplete.",
      "Compare price to fiber content, not to the brand name alone.",
    ],
    priceContext:
      "A higher price can reflect construction, mill, and finishing — or it can simply reflect a logo on a synthetic blend. Composition is the first filter; price is the second.",
    howSelected:
      "Linked collections are existing INTERTEXE material and category hubs with verified inventory. This page is reviewed when those hubs change in a meaningful way, not every time the catalog regenerates.",
    related: [
      { href: "/materials/wool-coats", label: "Wool coats" },
      { href: "/materials/cashmere-sweaters", label: "Cashmere sweaters" },
      { href: "/materials/silk-dresses", label: "Silk dresses" },
      { href: "/wool-clothing", label: "Wool clothing" },
    ],
  },
  {
    slug: "wool-coats-fall-winter",
    title: "Best Wool Coats for Fall and Winter",
    h1: "Wool coats worth inspecting before fall and winter",
    description:
      "How to evaluate wool coat composition, weight, and price on INTERTEXE — then shop verified wool coats by fabric, not by slogan.",
    lastReviewed: "2026-08-18",
    status: "indexable",
    publishAfter: "2026-08-01",
    intro: [
      "A winter coat is one of the few garments where fiber content, construction, and price should be read together. Wool can be warm, breathable, and durable. A coat labelled wool can still be a thin blend with a synthetic fill.",
      "Use this page to understand what to inspect, then browse INTERTEXE’s verified wool coat hub.",
    ],
    qualifies:
      "Coat listings on INTERTEXE are included only when composition data is present and natural-fiber content meets the catalog standard. Empty marketing copy is not enough.",
    whyMaterial:
      "Wool traps air, handles damp better than many fashion synthetics, and keeps its shape when the cloth is actually wool. Coat performance depends on the percentage, the weave, and whether the warmth is coming from wool or from polyester fill.",
    inspect: [
      "Shell composition first — 70% acrylic with a wool story is not a wool coat.",
      "Lining and insulation listed separately from the shell.",
      "Virgin wool, merino, cashmere blends, and recycled wool are not interchangeable.",
      "Weight and structure: a 100% wool coating cloth behaves differently from a light jersey 'coat'.",
    ],
    priceContext:
      "Price should move with cloth quality and construction, not only with the brand. A cheaper coat with honest 80% wool can be a better buy than an expensive coat that is mostly synthetic.",
    howSelected:
      "Product examples come from the existing INTERTEXE wool-coats hub, limited to a small verified sample. This is not a ranked 'best of' bought from a retailer.",
    fiber: "wool",
    category: "outerwear",
    related: [
      { href: "/materials/wool-coats", label: "Verified wool coats" },
      { href: "/materials/wool", label: "Wool clothing" },
      { href: "/guides/evaluate-coat-composition", label: "How to evaluate coat composition" },
    ],
  },
  {
    slug: "cashmere-sweaters-worth-the-price",
    title: "Cashmere Sweaters Worth the Price",
    h1: "When a cashmere sweater is worth the price",
    description:
      "How INTERTEXE reads cashmere composition, ply, and price so you can tell a real knit from a thin blend.",
    lastReviewed: "2026-08-18",
    status: "indexable",
    publishAfter: "2026-08-01",
    intro: [
      "Cashmere is priced like a luxury fiber because the supply is limited. That also makes it a frequent blend: a little cashmere in a mostly viscose or nylon knit can still be sold as a cashmere sweater.",
      "INTERTEXE does not grade mills from marketing claims. We show the composition that is on the product data and let you compare it with price.",
    ],
    qualifies:
      "Sweaters appear here only through the verified cashmere catalog. If composition is missing, the product is not treated as an indexable cashmere example.",
    whyMaterial:
      "Cashmere is warm for its weight and soft when the fibers are long enough. Short, low-grade fibers pill quickly. A 100% cashmere knit and a 10% cashmere blend are different products.",
    inspect: [
      "Percentage of cashmere in the shell, not in a trim.",
      "Whether wool, silk, or viscose is doing the structural work.",
      "Ply and gauge when the retailer discloses them — two-ply usually lasts longer than a gauzy single ply.",
      "Price against weight: unusually cheap '100% cashmere' deserves extra skepticism.",
    ],
    priceContext:
      "A higher price can be justified by grade, ply, and finishing. It is not justified by the word cashmere alone. Compare composition next to price before you click out.",
    howSelected:
      "Linked products are drawn from INTERTEXE cashmere sweater inventory, bounded to a small sample, with composition visible on the product page.",
    fiber: "cashmere",
    category: "knitwear",
    related: [
      { href: "/materials/cashmere-sweaters", label: "Cashmere sweaters" },
      { href: "/cashmere-clothing", label: "Cashmere clothing" },
      { href: "/materials/cashmere", label: "Cashmere hub" },
    ],
  },
  {
    slug: "better-material-fall-workwear",
    title: "Better-Material Fall Workwear",
    h1: "Fall workwear in better materials",
    description:
      "How to choose trousers, knits, and tailoring for work by composition — wool, cotton, silk, and linen — on INTERTEXE.",
    lastReviewed: "2026-08-18",
    status: "indexable",
    publishAfter: "2026-08-01",
    intro: [
      "Workwear has to survive sitting, commuting, and repeated washing. Fiber content predicts that more honestly than a lookbook.",
      "This is not a claim that synthetics are always wrong. Elastane in a wool trouser can be functional. A polyester shell sold as 'tailoring' is a different decision.",
    ],
    qualifies:
      "Looks linked from this page come from INTERTEXE wool, cotton, silk, and linen hubs. We do not assemble outfits from incomplete product records.",
    whyMaterial:
      "Wool holds a crease. Cotton breathes. Silk reads polished at night. Linen is viable in warm offices if you accept the wrinkle. The right choice depends on climate and how the garment is built.",
    inspect: [
      "Trouser composition including stretch fibers.",
      "Knitwear that is wool or cashmere versus acrylic.",
      "Shirt cotton versus viscose satin labelled as silk.",
      "Blazer cloth versus a synthetic scuba knit.",
    ],
    priceContext:
      "Office staples are where overpaying for polyester is common. If two trousers sit at similar prices, the higher natural-fiber percentage is usually the more useful comparison.",
    howSelected:
      "The page points to existing INTERTEXE category hubs rather than inventing a new filter URL for every office query.",
    related: [
      { href: "/materials/wool-pants", label: "Wool trousers" },
      { href: "/materials/cotton-shirts", label: "Cotton shirts" },
      { href: "/collections/tailoring", label: "Tailoring collection" },
      { href: "/materials/wool-sweaters", label: "Wool sweaters" },
    ],
  },
  {
    slug: "transitional-dresses",
    title: "Transitional Dresses in Silk, Cotton, Wool, and Linen",
    h1: "Transitional dresses: silk, cotton, wool, and linen",
    description:
      "How dress composition changes what you can wear between late summer and early fall, with INTERTEXE verified fabric hubs.",
    lastReviewed: "2026-08-18",
    status: "indexable",
    publishAfter: "2026-08-01",
    intro: [
      "A dress that works in August and October is usually a fiber decision: cotton and linen while it is warm, silk when you want drape, wool when the evening drops.",
      "INTERTEXE already separates these into material hubs so you are not looking at an undifferentiated 'dresses' grid.",
    ],
    qualifies:
      "Each linked hub only includes dresses with composition data that meets INTERTEXE catalog rules.",
    whyMaterial:
      "Silk drapes and layers under a coat. Cotton is the everyday option. Linen cools but wrinkles. Wool dresses exist for cooler offices and evening. None of those substitutions are universal.",
    inspect: [
      "Lining fibers — a polyester lining changes how a 'linen' dress wears.",
      "Stretch content if you need ease.",
      "Momme or weave language for silk, when disclosed.",
      "Whether 'satin' is silk or polyester.",
    ],
    priceContext:
      "Dress prices swing with brand more than with fiber. Read composition before you treat a sale price as a bargain.",
    howSelected:
      "This page is a guide across existing silk, cotton, wool, and linen dress hubs. It is not a new catch-all filter combination.",
    related: [
      { href: "/materials/silk-dresses", label: "Silk dresses" },
      { href: "/materials/cotton-dresses", label: "Cotton dresses" },
      { href: "/materials/linen-dresses", label: "Linen dresses" },
      { href: "/materials/silk-dresses-evening", label: "Silk evening dresses" },
    ],
  },
  {
    slug: "evaluate-coat-composition",
    title: "How to Evaluate Coat Composition Before Buying",
    h1: "How to evaluate coat composition before you buy",
    description:
      "A step-by-step INTERTEXE method for reading coat fiber content, linings, and price before you click through to a retailer.",
    lastReviewed: "2026-08-18",
    status: "indexable",
    publishAfter: "2026-08-01",
    intro: [
      "Coat copy is full of weather words: warm, wool-rich, technical, down alternative. The useful information is still the composition line.",
      "This method is the same one INTERTEXE uses to decide whether a product page is complete enough to index.",
    ],
    qualifies:
      "If a coat has no composition, no usable image, or no retailer destination, INTERTEXE will not treat it as an indexable product page.",
    whyMaterial:
      "Warmth can come from wool cloth, from a fill, or from a plastic shell. Those are different garments. Composition tells you which one you are considering.",
    inspect: [
      "Shell percentage breakdown.",
      "Fill or insulation listed separately.",
      "Lining fiber.",
      "Trim (collar, cuff) that is a different fiber from the body.",
    ],
    priceContext:
      "Do not assume a higher price means more wool. Compare the composition next to the price, then open the retailer only if the cloth still makes sense.",
    howSelected:
      "This is an editorial method page. Linked coat examples come from the wool coats hub when inventory is available.",
    fiber: "wool",
    category: "outerwear",
    related: [
      { href: "/materials/wool-coats", label: "Wool coats" },
      { href: "/guides/fall-2026-materials", label: "Fall 2026 materials" },
      { href: "/methodology", label: "Material methodology" },
    ],
  },
  {
    slug: "holiday-party-dresses-by-material",
    title: "Holiday Party Dresses by Material",
    h1: "Holiday party dresses by material",
    description:
      "Silk, velvet, satin, and sequins explained by fiber content so holiday dressing is a material choice, not a guess.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-09-15",
    intro: [
      "Holiday dressing is where polyester satin is most often sold as silk. Read the fiber line before the occasion copy.",
    ],
    qualifies: "Indexable only after editorial review of seasonal inventory, on or after 15 September 2026.",
    whyMaterial: "Silk, viscose satin, and polyester satin photograph similarly and wear differently.",
    inspect: ["Is satin silk or polyester?", "Are sequins on a natural or synthetic ground?", "Lining fiber."],
    priceContext: "Occasion prices are inflated by the calendar. Composition is still the useful comparison.",
    howSelected: "Will link to silk evening and viscose dress hubs after review.",
    related: [
      { href: "/materials/silk-dresses-evening", label: "Silk evening dresses" },
      { href: "/collections/evening", label: "Evening collection" },
    ],
  },
  {
    slug: "black-friday-fashion-quality",
    title: "Black Friday Fashion Quality Guide",
    h1: "Black Friday fashion: how to read quality before the discount",
    description:
      "A method for evaluating holiday sale clothing by composition so a discount on polyester is not mistaken for value.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-10-01",
    intro: [
      "Sale percentages are not quality. A 50% discount on a synthetic blend can still be more expensive per wear than a verified natural-fiber piece at full price.",
    ],
    qualifies: "Scheduled for 1 October 2026 so copy can be reviewed against live sale inventory.",
    whyMaterial: "Holiday sales concentrate polyester volume. Composition is the defense.",
    inspect: ["Compare sale price to fiber content.", "Ignore 'luxury look' language.", "Check lining and stretch."],
    priceContext: "The useful question is not 'how much off' but 'what is the cloth'.",
    howSelected: "Will point to /sale only after the sale catalog is reviewed.",
    related: [
      { href: "/sale", label: "Sale" },
      { href: "/methodology", label: "Material methodology" },
    ],
  },
  {
    slug: "natural-fiber-holiday-outfits",
    title: "Natural-Fiber Holiday Outfits",
    h1: "Natural-fiber holiday outfits",
    description: "How to assemble holiday outfits from verified silk, wool, cashmere, cotton, and linen instead of guessing from occasion copy.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-09-15",
    intro: ["Holiday outfits fail when the cloth is a photograph of luxury and a label of polyester."],
    qualifies: "Scheduled for 15 September 2026 pending inventory review.",
    whyMaterial: "The same silhouette in silk versus polyester satin is not the same garment.",
    inspect: ["Shell fiber", "Lining", "Whether sequins sit on a natural ground"],
    priceContext: "Occasion markups are not a substitute for composition.",
    howSelected: "Will link existing evening, silk, and wool hubs after review.",
    related: [{ href: "/collections/evening", label: "Evening collection" }],
  },
  {
    slug: "holiday-fabrics-velvet-silk-satin-sequins",
    title: "Velvet, Silk, Satin, and Sequins",
    h1: "Velvet, silk, satin, and sequins: what holiday clothes are made of",
    description: "A fiber-first explanation of holiday fabrics so satin is not assumed to be silk.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-09-15",
    intro: ["Satin is a weave. Silk is a fiber. Sequins are a surface. Velvet can be silk, viscose, or polyester."],
    qualifies: "Scheduled for 15 September 2026.",
    whyMaterial: "Holiday language hides fiber substitutions.",
    inspect: ["Is satin silk or polyester?", "Velvet pile fiber", "Ground cloth under embellishment"],
    priceContext: "A sequin dress price often tracks brand, not cloth.",
    howSelected: "Editorial method page; product examples only after review.",
    related: [{ href: "/materials/silk-dresses-evening", label: "Silk evening dresses" }],
  },
  {
    slug: "investment-accessories-material-quality",
    title: "Investment Accessories and Material Quality",
    h1: "Investment accessories: read the material before the hardware",
    description: "How INTERTEXE thinks about leather, suede, silk, and metal in accessories — without inventing product facts.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-09-15",
    intro: ["Accessories are where composition pages are often thinnest. INTERTEXE will not invent leather grades."],
    qualifies: "Scheduled. Handbags and shoes hubs are not auto-generated from filters.",
    whyMaterial: "Leather and suede age; polyurethane does not age the same way.",
    inspect: ["Leather versus coated fabric", "Suede versus split", "Lining fiber"],
    priceContext: "Hardware can cost more than hide. Still read the material line.",
    howSelected: "Will use leather hub examples only when composition is present.",
    related: [{ href: "/materials/leather", label: "Leather" }],
  },
  {
    slug: "holiday-travel-wardrobe-by-climate",
    title: "Holiday Travel Wardrobe by Climate",
    h1: "Holiday travel wardrobe by climate",
    description: "Linen and cotton for heat, wool and cashmere for cold — composition first, packing list second.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-09-15",
    intro: ["Climate decides fiber. A wool coat in the Caribbean is as wrong as linen in January Chicago."],
    qualifies: "Scheduled for 15 September 2026.",
    whyMaterial: "Breathability, insulation, and wrinkle behavior are fiber properties.",
    inspect: ["Destination climate", "Layering fibers", "Care constraints while travelling"],
    priceContext: "Packing fewer better-fiber pieces often beats a cheap synthetic pile.",
    howSelected: "Will point to linen, cotton, wool, and vacation hubs after review.",
    related: [{ href: "/collections/vacation", label: "Vacation collection" }],
  },
  {
    slug: "black-friday-quality-finds",
    title: "Best-Quality Black Friday Fashion Finds",
    h1: "Black Friday finds worth checking for composition",
    description: "How to use INTERTEXE during holiday sales to find discounted pieces that still have real fiber content.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-10-01",
    intro: ["A sale is useful only if the cloth was worth buying at full price."],
    qualifies: "Scheduled until sale inventory is reviewed in October 2026.",
    whyMaterial: "Discount volume is heavily synthetic.",
    inspect: ["Composition versus discount", "Original price honesty", "Lining"],
    priceContext: "Percent off is not value.",
    howSelected: "Will sample /sale after October review, not auto-publish every sale SKU.",
    related: [{ href: "/sale", label: "Sale" }],
  },
  {
    slug: "avoid-overpaying-for-polyester",
    title: "How to Avoid Overpaying for Polyester During Holiday Sales",
    h1: "How to avoid overpaying for polyester during holiday sales",
    description: "A method for spotting polyester sold as silk, wool, or cashmere when sale copy is loudest.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-10-01",
    intro: ["Polyester is not universally wrong. Overpaying for it because the copy said silk is the failure mode."],
    qualifies: "Scheduled for 1 October 2026.",
    whyMaterial: "Holiday photography favors sheen. Sheen is not fiber.",
    inspect: ["Satin versus silk", "Wool-rich versus acrylic", "Cashmere percentage"],
    priceContext: "If the fiber is polyester, price it as polyester.",
    howSelected: "Method page; no invented product claims.",
    related: [{ href: "/methodology", label: "Methodology" }],
  },
  {
    slug: "winter-coat-composition",
    title: "Winter Coat Composition Guide",
    h1: "Winter coat composition guide",
    description: "Shell, fill, and lining — how to read a winter coat before you buy.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-10-01",
    intro: ["Warmth can come from wool cloth or from a synthetic fill. Those are different coats."],
    qualifies: "Scheduled. Complements the August coat-evaluation guide.",
    whyMaterial: "Insulation is not the same as a wool shell.",
    inspect: ["Shell", "Fill", "Lining", "Trim"],
    priceContext: "Fill type and cloth quality should move price more than the word 'winter'.",
    howSelected: "Links the wool coats hub after review.",
    related: [{ href: "/guides/evaluate-coat-composition", label: "Evaluate coat composition" }],
  },
  {
    slug: "cashmere-gift-guide",
    title: "Cashmere Gift Guide",
    h1: "Cashmere gifts: composition before wrapping",
    description: "How to give cashmere without buying a thin blend labelled as a luxury knit.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-10-01",
    intro: ["Cashmere is a frequent gift and a frequent blend."],
    qualifies: "Scheduled for 1 October 2026.",
    whyMaterial: "Percentage and ply decide whether the gift lasts a season or a decade.",
    inspect: ["Cashmere percent", "Blend partners", "Price versus weight"],
    priceContext: "Unusually cheap 100% cashmere deserves skepticism.",
    howSelected: "Will use the cashmere sweater hub after review.",
    related: [{ href: "/materials/cashmere-sweaters", label: "Cashmere sweaters" }],
  },
  {
    slug: "silk-gift-guide",
    title: "Silk Gift Guide",
    h1: "Silk gifts: make sure the satin is silk",
    description: "How to choose silk gifts by composition rather than by holiday sheen.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-10-01",
    intro: ["Silk gifts fail when the garment is polyester satin."],
    qualifies: "Scheduled for 1 October 2026.",
    whyMaterial: "Silk drapes and breathes; polyester satin photographs similarly.",
    inspect: ["Fiber line", "Lining", "Care"],
    priceContext: "A silk blouse price should be compared to silk content, not to the gift occasion.",
    howSelected: "Silk clothing and blouse hubs after review.",
    related: [{ href: "/silk-clothing", label: "Silk clothing" }],
  },
  {
    slug: "gifts-for-material-conscious-shoppers",
    title: "Gifts for Material-Conscious Shoppers",
    h1: "Gifts for material-conscious shoppers",
    description: "Gift ideas framed by verified composition, not by a generic luxury mood board.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-10-01",
    intro: ["The useful gift for this reader is an honest label."],
    qualifies: "Scheduled. No auto-generated gift grid from the full catalog.",
    whyMaterial: "The recipient already cares about fiber. Do not wrap a blend as a virtue.",
    inspect: ["Composition completeness", "Natural-fiber percent", "Retailer destination"],
    priceContext: "Match budget to fiber, not to wrapping.",
    howSelected: "Curated links to existing hubs after October review.",
    related: [{ href: "/guides", label: "Guides" }],
  },
  {
    slug: "holiday-dress-edit",
    title: "Holiday Dress Edit",
    h1: "Holiday dress edit",
    description: "An evergreen holiday dress edit keyed to fabric, updated only after inventory review.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-11-01",
    intro: ["This URL should stay stable across years. The year in the copy is reviewed, not auto-incremented."],
    qualifies: "Scheduled for 1 November 2026.",
    whyMaterial: "Dresses for events are where fiber substitution is most profitable for the seller.",
    inspect: ["Silk versus polyester satin", "Lining", "Stretch"],
    priceContext: "Compare composition next to the ticket price.",
    howSelected: "Silk evening and viscose dress hubs after review.",
    related: [{ href: "/materials/silk-dresses-evening", label: "Silk evening dresses" }],
  },
  {
    slug: "holiday-gifts-by-material-and-price",
    title: "Holiday Gifts by Material and Price",
    h1: "Holiday gifts by material and price",
    description: "A gift map that starts with fiber and budget, not with a branded mood.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-11-01",
    intro: ["Price bands without composition are decoration."],
    qualifies: "Scheduled for 1 November 2026.",
    whyMaterial: "Gifts fail when the material does not match the spend.",
    inspect: ["Fiber", "Price", "Whether the page still has a live retailer link"],
    priceContext: "Keep price and composition on the same screen.",
    howSelected: "Will not dump the catalog into price buckets automatically.",
    related: [{ href: "/guides/cashmere-gift-guide", label: "Cashmere gifts" }],
  },
  {
    slug: "luxury-gifts-better-composition",
    title: "Luxury Gifts with Better Composition",
    h1: "Luxury gifts with better composition",
    description: "Luxury pricing is not proof of fiber quality. This page will only cite verified composition.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-11-01",
    intro: ["Luxury is a price tier. Composition is a fact."],
    qualifies: "Scheduled for 1 November 2026.",
    whyMaterial: "Designer names do not guarantee a natural shell.",
    inspect: ["Brand plus composition, never brand alone"],
    priceContext: "If the fiber is ordinary, the luxury claim is incomplete.",
    howSelected: "Designer and material hubs after review.",
    related: [{ href: "/designers", label: "Designers" }],
  },
  {
    slug: "stocking-stuffers-natural-fibers",
    title: "Stocking Stuffers in Natural Fibers",
    h1: "Stocking stuffers in natural fibers",
    description: "Small gifts where the fiber is still worth reading — scarves, socks, and knits with real composition.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-11-01",
    intro: ["Small items are where acrylic masquerades as cashmere most often."],
    qualifies: "Scheduled. No thin auto pages for every SKU under a price cap.",
    whyMaterial: "A scarf is a fiber object. The word 'cashmere' on a hangtag is not enough.",
    inspect: ["Percent cashmere or wool", "Size of the item versus price"],
    priceContext: "Cheap cashmere blends are still blends.",
    howSelected: "Cashmere and wool hubs after review.",
    related: [{ href: "/materials/cashmere", label: "Cashmere" }],
  },
  {
    slug: "new-years-eve-dresses-by-fabric",
    title: "New Year’s Eve Dresses by Fabric",
    h1: "New Year’s Eve dresses by fabric",
    description: "NYE dressing as a fabric choice: silk, viscose, wool, or polyester satin — named honestly.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-11-01",
    intro: ["Keep this URL evergreen. Update the year in copy only after review."],
    qualifies: "Scheduled for 1 November 2026.",
    whyMaterial: "Evening light hides polyester. The label does not.",
    inspect: ["Satin fiber", "Stretch", "Lining"],
    priceContext: "A one-night dress still has a fiber cost per wear.",
    howSelected: "Evening collection and silk evening hubs.",
    related: [{ href: "/collections/evening", label: "Evening" }],
  },
  {
    slug: "resort-winter-sun-materials",
    title: "Resort and Winter-Sun Material Edit",
    h1: "Resort and winter-sun materials",
    description: "Linen, cotton, and silk for heat in winter — composition first, destination second.",
    lastReviewed: "2026-08-18",
    status: "scheduled",
    publishAfter: "2026-11-01",
    intro: ["Winter sun is a linen and cotton problem, not a wool problem."],
    qualifies: "Scheduled for 1 November 2026.",
    whyMaterial: "Heat and humidity reward breathable fibers.",
    inspect: ["Linen percent", "Cotton versus viscose", "Polyester 'linen look'"],
    priceContext: "Resort prices inflate. Fiber still decides comfort.",
    howSelected: "Vacation, linen, and cotton hubs after review.",
    related: [{ href: "/collections/vacation", label: "Vacation" }],
  },
];

export function guideBySlug(slug: string): GuidePage | undefined {
  return GUIDE_PAGES.find((g) => g.slug === slug);
}

export function indexableGuides(now = new Date()): GuidePage[] {
  return GUIDE_PAGES.filter((g) => {
    if (g.status !== "indexable") return false;
    return new Date(`${g.publishAfter}T00:00:00Z`).getTime() <= now.getTime();
  });
}
