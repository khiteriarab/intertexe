/**
 * KHITERI'S EDIT — monthly editorial landing config.
 *
 * To publish a new month, update ACTIVE_KHITERIS_EDIT:
 * - monthLabel
 * - subtitle (optional)
 * - coverImage
 * - moodBoard.images (+ optional caption)
 * - products (exactly 10)
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
      price: "$370",
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
export const ACTIVE_KHITERIS_EDIT = KHITERIS_EDIT_JULY_2026;

export function getKhiterisEditConfig(): KhiterisEditConfig {
  return ACTIVE_KHITERIS_EDIT;
}
