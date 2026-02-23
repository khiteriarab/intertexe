const BRAND_HERO_IMAGES: Record<string, string> = {
  "frame": "https://frame-store.com/cdn/shop/files/251003_FRAME_SPRNG26_LOOK_02_0252_03_RGB_2000x2666_b2fb19c0-d51f-449c-8077-1693fa74870e.jpg?v=1764896267&width=1200",
  "ba&sh": "https://ba-sh.com/on/demandware.static/-/Library-Sites-BashSharedLibrary/default/dwecd1e558/SS26/Casual_Chic_Denim/ALL-3_Slider-desktop_backtocool_2000x860px.jpg",
  "khaite": "https://khaite.com/cdn/shop/files/S26_R1_HomePageHeroBanner_Desktop_02.10.26_acfd338a-9a9b-4327-bf6f-1fc0d67c0aaf.jpg?v=1770418145&width=1920",
  "anine bing": "https://www.aninebing.com/cdn/shop/files/DESKTOP_1_22c19e0a-1abe-4be3-8374-0224a6c0d9ed_1920x.progressive.jpg?v=1771260049",
  "agolde": "https://agolde.com/cdn/shop/files/preview_images/e382c0144ff74647aa2a1b1af3363a3c.thumbnail.0000000000.jpg?v=1771282315&width=1200",
  "isabel marant": "https://isabelmarant.com/cdn/shop/files/HP_Hero_Banner_2000x800_Etoile_Bolton.jpg?crop=center&height=800&v=1771320465&width=2000",
  "reiss": "https://reiss.com/cms/resource/blob/1400442/dd5961a2de251b200ebbdf7a958e6fce/uk-hp-image1-data.jpg",
  "maje": "https://maje.com/on/demandware.static/-/Library-Sites-Maje-Shared/default/dwb473bd30/site/home/ss26/push-menu/SS26_PM.jpg",
  "zimmermann": "https://www.zimmermann.com/media/wysiwyg/2000x1200.jpg",
  "stella mccartney": "https://www.stellamccartney.com/dw/image/v2/BCWD_PRD/on/demandware.static/-/Sites-master_catalog/default/dw3c26da1b/Assets/7B0139WP05331000_X/large/f/3/b/e/f3be9b92b011f914799d46825602bcda26f572a4_7B0139WP05331000_X.jpg?sw=800&sh=1000",
  "acne studios": "https://www.acnestudios.com/on/demandware.static/-/Library-Sites-acne/default/dw0ed7f45c/home/2026/w08/ss26-woman-d.jpg",
  "re/done": "https://shopredone.com/cdn/shop/files/HP_Desktop3A.png?v=1770341915&width=1200",
  "nanushka": "https://www.nanushka.com/cdn/shop/files/1-4_dc57372d-5e11-42d9-9109-1fed5455f31c.jpg?v=1758183209",
};

const FASHION_EDITORIAL_IMAGES = [
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1581044777550-4cfa60707998?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1495385794356-15371f348c31?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80&fit=crop&crop=top",
  "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1551803091-e20673f15770?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1502716119720-b23a1e3b2a55?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1512310604669-443f26c35f52?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1513379733131-47fc74b45fc7?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1470468969717-61d5d54fd036?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80&fit=crop",
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80&fit=crop",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getBrandHeroImage(brandName: string): string {
  const lower = brandName.toLowerCase().trim();

  if (BRAND_HERO_IMAGES[lower]) {
    return BRAND_HERO_IMAGES[lower];
  }

  for (const [key, url] of Object.entries(BRAND_HERO_IMAGES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return url;
    }
  }

  const index = hashString(lower) % FASHION_EDITORIAL_IMAGES.length;
  return FASHION_EDITORIAL_IMAGES[index];
}
