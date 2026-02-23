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

const BRAND_SCREENSHOT_DOMAINS: Record<string, string> = {
  "sézane": "sezane.com",
  "sezane": "sezane.com",
  "reformation": "thereformation.com",
  "ganni": "ganni.com",
  "totême": "toteme-studio.com",
  "toteme": "toteme-studio.com",
  "cos": "cos.com",
  "theory": "theory.com",
  "vince": "vince.com",
  "sandro": "sandro-paris.com",
  "iro": "iroparis.com",
  "jacquemus": "jacquemus.com",
  "club monaco": "clubmonaco.com",
  "max mara": "us.maxmara.com",
  "proenza schouler": "proenzaschouler.com",
  "the row": "therow.com",
  "chloé": "chloe.com",
  "chloe": "chloe.com",
  "loewe": "loewe.com",
  "bottega veneta": "bottegaveneta.com",
  "brunello cucinelli": "brunellocucinelli.com",
  "loro piana": "loropiana.com",
  "jil sander": "jilsander.com",
  "lemaire": "lemaire.fr",
  "ami paris": "amiparis.com",
  "a.p.c.": "apc.fr",
  "equipment": "equipmentfr.com",
  "rag & bone": "rag-bone.com",
  "citizens of humanity": "citizensofhumanity.com",
  "ted baker": "tedbaker.com",
  "allsaints": "allsaints.com",
  "all saints": "allsaints.com",
  "arket": "arket.com",
  "& other stories": "stories.com",
  "claudie pierlot": "claudiepierlot.com",
  "zadig & voltaire": "zadig-et-voltaire.com",
  "margaret howell": "margarethowell.co.uk",
  "joseph": "joseph-fashion.com",
  "eileen fisher": "eileenfisher.com",
};

export function getBrandHeroImage(brandName: string): string | null {
  const lower = brandName.toLowerCase().trim();

  if (BRAND_HERO_IMAGES[lower]) {
    return BRAND_HERO_IMAGES[lower];
  }

  for (const [key, url] of Object.entries(BRAND_HERO_IMAGES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return url;
    }
  }

  const domain = BRAND_SCREENSHOT_DOMAINS[lower];
  if (domain) {
    return `https://s.wordpress.com/mshots/v1/https://${domain}?w=800&h=1000`;
  }

  return null;
}
