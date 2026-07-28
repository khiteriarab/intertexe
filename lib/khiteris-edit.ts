/**
 * KHITERI'S EDIT — monthly editorial landing config.
 *
 * To publish a new month, update ACTIVE_KHITERIS_EDIT:
 * - monthLabel
 * - subtitle (optional)
 * - coverImage
 * - moodBoard.images (+ optional caption)
 * - products (curated list for the month)
 *
 * Everything else (copy, layout, CTAs) stays the same.
 */

export type KhiterisEditImage = {
  src: string;
  alt: string;
};

export type KhiterisEditProduct = {
  id: string;
  name: string;
  composition: string;
  price: string;
  brand: string;
  /** Default affiliate click-out URL (fallback). */
  href: string;
  /** Curated regional URLs when catalog lookup is ambiguous or unavailable. */
  hrefByRegion?: Partial<Record<"us" | "uk" | "eu" | "ca", string>>;
  /** Optional catalog SKU (e.g. Mytheresa P01184019) to match the correct affiliate row. */
  catalogSku?: string;
  image: KhiterisEditImage;
  /** Optional editorial spotlight treatment (e.g. airport travel story). */
  spotlight?: {
    kind: "airport";
    note: string;
  };
};

export type KhiterisEditConfig = {
  /** URL slug — always "khiteri" for intertexe.com/khiteri */
  slug: "khiteri";
  monthLabel: string;
  title: string;
  subtitle?: string;
  coverImage: KhiterisEditImage;
  moodBoard: {
    caption?: string;
    images: KhiterisEditImage[];
  };
  products: KhiterisEditProduct[];
};

/** July 2026 — live catalog picks (full-body on-model images where available). */
export const KHITERIS_EDIT_JULY_2026: KhiterisEditConfig = {
  slug: "khiteri",
  monthLabel: "July 2026",
  title: "KHITERI'S EDIT",
  subtitle: "10 natural-fiber pieces I'm loving this month.",
  coverImage: {
    src: "https://cdn.shopify.com/s/files/1/1130/9504/files/S57-FF2904-BLK-23935-FaithfullTheBrand-D2-1184.webp?v=1712029525",
    alt: "Faithfull the Brand Maceio Maxi Dress Black",
  },
  moodBoard: {
    caption: "Salt air, linen, and nowhere to be.",
    images: [
      {
        src: "https://cdn.shopify.com/s/files/1/1130/9504/files/S118-FF3981-WHT-24956-FaithfullTheBrand-D1-1728.webp?v=1745222160",
        alt: "Faithfull the Brand Denise Mini Dress White",
      },
      {
        src: "https://cdn.shopify.com/s/files/1/1130/9504/files/S129-FF3997-CRI-24956-FaithfullTheBrand-D1-1172.webp?v=1746674010",
        alt: "Faithfull the Brand Orion Mini Dress Cerise",
      },
      {
        src: "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/22/P01184019.jpg",
        alt: "Citizens of Humanity Tailored Linen Trouser",
      },
      {
        src: "https://cdn.shopify.com/s/files/1/2243/5959/files/WES04866WE.100_10.jpg?v=1768885979",
        alt: "Dissh Dina Off White Cotton Asym Knit Top",
      },
    ],
  },
  products: [
    {
      id: "01",
      name: "Tailored Linen Trouser",
      composition: "100% Linen",
      price: "$298",
      brand: "Citizens of Humanity",
      catalogSku: "P01184019",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=1170371.138678912206130907219885&type=15&murl=https%3A%2F%2Fwww.bloomingdales.com%2Fshop%2Fproduct%2Fcitizens-of-humanity-brynn-drawstring-linen-trousers%3FID%3D5885503%26PartnerID%3DLINKSHARE%26cm_mmc%3DLINKSHARE-_-n-_-n-_-n",
      hrefByRegion: {
        us: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=1170371.138678912206130907219885&type=15&murl=https%3A%2F%2Fwww.bloomingdales.com%2Fshop%2Fproduct%2Fcitizens-of-humanity-brynn-drawstring-linen-trousers%3FID%3D5885503%26PartnerID%3DLINKSHARE%26cm_mmc%3DLINKSHARE-_-n-_-n-_-n",
        uk: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2034086.356631096927065432749883&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fgb%2Fen%2Fwomen%2Fcitizens-of-humanity-brynn-linen-wide-leg-pants-beige-p01184019%3Ffeed_num%3DP01184019%26feed_des%3DCitizensofHumanity%26feed_mwg%3Dclothing",
        eu: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2034086.356631096927065432749883&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fgb%2Fen%2Fwomen%2Fcitizens-of-humanity-brynn-linen-wide-leg-pants-beige-p01184019%3Ffeed_num%3DP01184019%26feed_des%3DCitizensofHumanity%26feed_mwg%3Dclothing",
      },
      image: {
        src: "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/22/P01184019.jpg",
        alt: "Citizens of Humanity Tailored Linen Trouser on model",
      },
    },
    {
      id: "02",
      name: "Maceio Maxi Dress Black",
      composition: "100% Cotton",
      price: "$64",
      brand: "Faithfull the Brand",
      href: "https://click.linksynergy.com/deeplink?id=*8b0zWDyXo0&mid=46961&murl=https%3A%2F%2Fwww.faithfullthebrand.com%2Fproducts%2Fmaceio-maxi-dress-black",
      image: {
        src: "https://cdn.shopify.com/s/files/1/1130/9504/files/S57-FF2904-BLK-23935-FaithfullTheBrand-D2-1184.webp?v=1712029525",
        alt: "Faithfull the Brand Maceio Maxi Dress Black on model",
      },
    },
    {
      id: "03",
      name: "Denise Mini Dress Black",
      composition: "100% Cotton",
      price: "$90",
      brand: "Faithfull the Brand",
      href: "https://click.linksynergy.com/deeplink?id=*8b0zWDyXo0&mid=46961&murl=https%3A%2F%2Fwww.faithfullthebrand.com%2Fproducts%2Fdenise-mini-dress-black",
      image: {
        src: "https://cdn.shopify.com/s/files/1/1130/9504/files/S125-FF3981-BLK-24956-FaithfullTheBrand-D3-1647.webp?v=1748932134",
        alt: "Faithfull the Brand Denise Mini Dress Black on model",
      },
    },
    {
      id: "04",
      name: "Orion Mini Dress Cerise",
      composition: "100% Cotton",
      price: "$119",
      brand: "Faithfull the Brand",
      href: "https://click.linksynergy.com/deeplink?id=*8b0zWDyXo0&mid=46961&murl=https%3A%2F%2Fwww.faithfullthebrand.com%2Fproducts%2Forion-mini-dress-cerise",
      image: {
        src: "https://cdn.shopify.com/s/files/1/1130/9504/files/S129-FF3997-CRI-24956-FaithfullTheBrand-D1-1172.webp?v=1746674010",
        alt: "Faithfull the Brand Orion Mini Dress Cerise on model",
      },
    },
    {
      id: "05",
      name: "Aqua Sleeveless Knit Dress Exclusive",
      composition: "100% Cotton",
      price: "$128",
      brand: "Aqua",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=1170371.138675803605066612308468&type=15&murl=https%3A%2F%2Fwww.bloomingdales.com%2Fshop%2Fproduct%2Faqua-sleeveless-knit-dress-exclusive%3FID%3D5885115%26PartnerID%3DLINKSHARE%26cm_mmc%3DLINKSHARE-_-n-_-n-_-n",
      image: {
        src: "https://images.bloomingdalesassets.com/is/image/BLM/products/6/optimized/15705546_fpx.tif?wid=1200&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg",
        alt: "Aqua Sleeveless Knit Dress Exclusive on model",
      },
    },
    {
      id: "06",
      name: "Florence Strappy Back Dress In Driftwood",
      composition: "97% Cotton",
      price: "$145",
      brand: "Pistola",
      href: "https://click.linksynergy.com/deeplink?id=*8b0zWDyXo0&mid=50745&murl=https%3A%2F%2Fshop.simon.com%2Fproducts%2Fflorence-strappy-back-dress-in-driftwood%3Fvariant%3D43619877584956",
      image: {
        src: "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/4f046fdaf9d340f1945bfff8c55686cf.jpg?v=1761690001",
        alt: "Pistola Florence Strappy Back Dress In Driftwood on model",
      },
    },
    {
      id: "07",
      name: "Zeke Wide Leg Jeans | Aged Mid",
      composition: "100% Cotton",
      price: "$49",
      brand: "DL1961",
      href: "https://www.dl1961.com/products/zeke-wide-leg-jeans-aged-mid",
      image: {
        src: "https://cdn.shopify.com/s/files/1/2397/3099/files/24055_ZEKE_AGED_MID.jpg?v=1752511980",
        alt: "DL1961 Zeke Wide Leg Jeans Aged Mid on model",
      },
    },
    {
      id: "08",
      name: "Denise Mini Dress White",
      composition: "100% Cotton",
      price: "$126",
      brand: "Faithfull the Brand",
      href: "https://click.linksynergy.com/deeplink?id=*8b0zWDyXo0&mid=46961&murl=https%3A%2F%2Fwww.faithfullthebrand.com%2Fproducts%2Fdenise-mini-dress-white",
      image: {
        src: "https://cdn.shopify.com/s/files/1/1130/9504/files/S118-FF3981-WHT-24956-FaithfullTheBrand-D1-1728.webp?v=1745222160",
        alt: "Faithfull the Brand Denise Mini Dress White on model",
      },
    },
    {
      id: "09",
      name: "Chana Skirt In White",
      composition: "98% Natural Fiber",
      price: "$85",
      brand: "ASTR",
      href: "https://click.linksynergy.com/deeplink?id=*8b0zWDyXo0&mid=50745&murl=https%3A%2F%2Fshop.simon.com%2Fproducts%2Fchana-skirt-in-white%3Fvariant%3D43529938796604",
      image: {
        src: "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/d6f9648ed8bf494897d3640d0582eb71.jpg?v=1758750010",
        alt: "ASTR Chana Skirt In White on model",
      },
    },
    {
      id: "10",
      name: "Dina Off White Cotton Asym Knit Top",
      composition: "100% Cotton",
      price: "$130",
      brand: "Dissh",
      href: "https://www.dissh.com.au/products/dina-white-cotton-asym-knit-top",
      image: {
        src: "https://cdn.shopify.com/s/files/1/2243/5959/files/WES04866WE.100_10.jpg?v=1768885979",
        alt: "Dissh Dina Off White Cotton Asym Knit Top on model with wide-leg trousers",
      },
    },
  ],
};

/** Point to the current month's config. Swap this export when publishing a new edit. */
export const KHITERIS_EDIT_AUGUST_2026: KhiterisEditConfig = {
  slug: "khiteri",
  monthLabel: "August 2026",
  title: "KHITERI'S EDIT",
  subtitle: "My favorites — linen, silk, leather — shoppable via MyTheresa.",
  coverImage: {
    src: "/khiteri/cover-august.jpg",
    alt: "Dissh Cora Natural Midi Linen Dress on model",
  },
  moodBoard: {
    caption: "Airport soft, dinner ready — natural fibers that move with you.",
    images: [
      {
        src: "https://cdn.shopify.com/s/files/1/2243/5959/files/DQF01039NAT.150_10.jpg?v=1751878227",
        alt: "Dissh Cora Natural Midi Linen Dress",
      },
      {
        src: "/khiteri/attico-barrel-sweats.jpg",
        alt: "The Attico Cotton Jersey Barrel Leg Sweatpants",
      },
      {
        src: "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/65/P01129372.jpg",
        alt: "Rebecca Vallance Elise Halterneck Silk Satin Top",
      },
      {
        src: "/khiteri/chloe-nama-thong.jpg",
        alt: "Chloé Nama Leather Platform Thong Sandals",
      },
    ],
  },
  products: [
    {
      id: "01",
      name: "Cora Natural Midi Linen Dress",
      composition: "100% Linen",
      price: "$95",
      brand: "Dissh",
      href: "https://www.dissh.com.au/products/cora-natural-linen-midi-dress",
      image: {
        src: "https://cdn.shopify.com/s/files/1/2243/5959/files/DQF01039NAT.150_10.jpg?v=1751878227",
        alt: "Dissh Cora Natural Midi Linen Dress on model",
      },
    },
    {
      id: "02",
      name: "Cotton Jersey Barrel Leg Sweatpants",
      composition: "100% Cotton",
      price: "$590",
      brand: "The Attico",
      catalogSku: "P01179244",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.431729916695830791739469&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Fthe-attico-cotton-jersey-barrel-leg-sweatpants-grey-p01179244%3Ffeed_num%3DP01179244%26feed_des%3DTheAttico%26feed_mwg%3Dclothing",
      image: {
        src: "/khiteri/attico-barrel-sweats.jpg",
        alt: "The Attico Cotton Jersey Barrel Leg Sweatpants — airport soft",
      },
      spotlight: {
        kind: "airport",
        note: "Gate soft. Barrel leg. Built for the terminal — and whatever comes after.",
      },
    },
    {
      id: "03",
      name: "Elise Halterneck Silk Satin Top",
      composition: "100% Silk",
      price: "$400",
      brand: "Rebecca Vallance",
      catalogSku: "P01129372",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.4317211761849532020645794&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Frebecca-vallance-elise-halterneck-silk-satin-top-white-p01129372%3Ffeed_num%3DP01129372%26feed_des%3DRebeccaVallance%26feed_mwg%3Dclothing",
      image: {
        src: "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/65/P01129372.jpg",
        alt: "Rebecca Vallance Elise Halterneck Silk Satin Top",
      },
    },
    {
      id: "04",
      name: "Crochet Cotton Polo Dress",
      composition: "100% Cotton",
      price: "$310",
      brand: "Anna Kosturova",
      catalogSku: "P01126127",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.431721277784404804790463&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Fanna-kosturova-crochet-cotton-polo-dress-brown-p01126127%3Ffeed_num%3DP01126127%26feed_des%3DAnnaKosturova%26feed_mwg%3Dclothing",
      image: {
        src: "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/ef/P01126127.jpg",
        alt: "Anna Kosturova Crochet Cotton Polo Dress",
      },
    },
    {
      id: "05",
      name: "Midi Dress",
      composition: "100% Silk",
      price: "$1,100",
      brand: "Magda Butrym",
      catalogSku: "P00783396",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.431727586953444816495027&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Fmagda-butrym-midi-dress-p00783396%3Ffeed_num%3DP00783396%26feed_des%3DMagdaButrym%26feed_mwg%3Dclothing",
      image: {
        src: "/khiteri/magda-butrym-midi.jpg",
        alt: "Magda Butrym Midi Dress",
      },
    },
    {
      id: "06",
      name: "Nama Leather Platform Thong Sandals",
      composition: "Upper: 100% Bovine leather",
      price: "$690",
      brand: "Chloé",
      catalogSku: "P01188299",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.431722513529180149466356&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Fchloe-nama-leather-platform-thong-sandals-brown-p01188299%3Ffeed_num%3DP01188299%26feed_des%3DChlo%C3%A9%26feed_mwg%3Dshoes",
      image: {
        src: "/khiteri/chloe-nama-thong.jpg",
        alt: "Chloé Nama Leather Platform Thong Sandals",
      },
    },
    {
      id: "07",
      name: "Elmer Suede Thong Sandals",
      composition: "Upper: 100% Goat leather",
      price: "$260",
      brand: "A. Emery",
      catalogSku: "P01170372",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.431724790249022875945986&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Fa-emery-elmer-suede-thong-sandals-green-p01170372%3Ffeed_num%3DP01170372%26feed_des%3DA.Emery%26feed_mwg%3Dshoes",
      image: {
        src: "/khiteri/a-emery-elmer.jpg",
        alt: "A. Emery Elmer Suede Thong Sandals",
      },
    },
    {
      id: "08",
      name: "Horsebit Suede Mules",
      composition: "Upper: 100% Bovine Leather",
      price: "$1,290",
      brand: "Gucci",
      catalogSku: "P01170520",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.43172868807441451773561&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Fgucci-horsebit-suede-mules-green-p01170520%3Ffeed_num%3DP01170520%26feed_des%3DGucci%26feed_mwg%3Dshoes",
      image: {
        src: "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/61/P01170520.jpg",
        alt: "Gucci Horsebit Suede Mules",
      },
    },
    {
      id: "09",
      name: "Cirry Leather Mules",
      composition: "Upper: 100% bovine leather",
      price: "$1,690",
      brand: "Ferragamo",
      catalogSku: "P01166835",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.431724264721574066553144&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Fferragamo-cirry-leather-mules-black-p01166835%3Ffeed_num%3DP01166835%26feed_des%3DFerragamo%26feed_mwg%3Dshoes",
      image: {
        src: "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/0f/P01166835.jpg",
        alt: "Ferragamo Cirry Leather Mules",
      },
    },
    {
      id: "10",
      name: "Rockstud Leather Thong Sandals",
      composition: "Upper: 100% Bovine Leather",
      price: "$750",
      brand: "Valentino Garavani",
      catalogSku: "P01179735",
      href: "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.431726439440799519731505&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Fvalentino-garavani-rockstud-leather-thong-sandals-white-p01179735%3Ffeed_num%3DP01179735%26feed_des%3DValentinoGaravani%26feed_mwg%3Dshoes",
      image: {
        src: "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/d8/P01179735.jpg",
        alt: "Valentino Garavani Rockstud Leather Thong Sandals",
      },
    },
  ],
};

export const KHITERIS_EDIT_ARCHIVE: Array<Pick<KhiterisEditConfig, "monthLabel" | "title" | "subtitle"> & { href: string }> = [
  { monthLabel: KHITERIS_EDIT_AUGUST_2026.monthLabel, title: KHITERIS_EDIT_AUGUST_2026.title, subtitle: KHITERIS_EDIT_AUGUST_2026.subtitle, href: "/khiteri" },
  { monthLabel: KHITERIS_EDIT_JULY_2026.monthLabel, title: KHITERIS_EDIT_JULY_2026.title, subtitle: KHITERIS_EDIT_JULY_2026.subtitle, href: "/khiteri?preview=2026-07" },
];

export const ACTIVE_KHITERIS_EDIT = KHITERIS_EDIT_AUGUST_2026;

export function getKhiterisEditConfig(): KhiterisEditConfig {
  return ACTIVE_KHITERIS_EDIT;
}
