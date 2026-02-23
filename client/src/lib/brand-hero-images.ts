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
  "ganni": "https://www.ganni.com/dw/image/v2/AAWT_PRD/on/demandware.static/-/Library-Sites-ganni-shared/default/dwa2e1293d/images/homepage/HP-WK7-1.jpg?sw=1600",
  "totême": "https://toteme.com/cdn/shop/files/13_251118_TOTEME_WEAR_034_1.jpg?v=1771339720&width=1500",
  "toteme": "https://toteme.com/cdn/shop/files/13_251118_TOTEME_WEAR_034_1.jpg?v=1771339720&width=1500",
  "theory": "https://ak-media.theory.com/i/theory/W-New-Arrivals-Flyout_1.jpg?$mediaDesktopLarge$",
  "sandro": "https://www.sandro-paris.com/on/demandware.static/-/Library-Sites-Sandro-Shared/default/dw5782132f/Megamenu/CAMPAGNE-SS26_IMAGEMENU_CHAUSSURE_F.jpg",
  "iro": "https://www.iroparis.com/on/demandware.static/-/Sites-storefront_eur/default/dwcbc7aef9/260128_TEMPLATE_MENU_PROMOTIONAL_BANNER.jpg",
  "club monaco": "https://www.clubmonaco.com/cdn/shop/files/260204_SiteFlip_Promo_Desktop.jpg?v=1770069167&width=2500",
  "proenza schouler": "https://www.proenzaschouler.com/cdn/shop/files/305300260029_INSTA_ML_HEADER.jpg?v=1770076333&width=450",
  "the row": "https://www.therow.com/cdn/shop/files/THE-ROW-Spring26-1080-1080-8_5132c3bc-9c82-40a0-aeec-f243dc125fb9.jpg?v=1770737574&width=800",
  "chloé": "https://www.chloe.com/on/demandware.static/-/Library-Sites-Chloe-WW/default/dw4e8cc887/MENU_EDITORIAL/Edito_slider/SUMMER26-MENU-SLIDER-PADDINGTON-1.1.jpg",
  "chloe": "https://www.chloe.com/on/demandware.static/-/Library-Sites-Chloe-WW/default/dw4e8cc887/MENU_EDITORIAL/Edito_slider/SUMMER26-MENU-SLIDER-PADDINGTON-1.1.jpg",
  "loewe": "https://www.loewe.com/dw/image/v2/BBPC_PRD/on/demandware.static/-/Library-Sites-LOW_SharedLibrary/default/dw973598fb/000000%201%20SS26/MAIN%20CAMPAIGN/LOEWE_SS26_MAIN_CAMPAIGN_TALIA_RYDER_sRGB_CROPPED_23_3x4.jpg?sw=1300&sfrm=jpg",
  "bottega veneta": "https://bottega-veneta.dam.kering.com/asset/e253b51d-6b72-42e5-9638-3122d81e7e75/Medium/BV_S26_Adv_sRGB_4x5_imageonly_B23.jpg",
  "jil sander": "https://www.jilsander.com/dw/image/v2/BCBQ_PRD/on/demandware.static/-/Library-Sites-JilSanderSharedLibrary/default/dwbfced3a2/content/HOME/SS26_WOMEN_HOME.jpg?sw=1300&sfrm=jpg",
  "allsaints": "https://www.allsaints.com/on/demandware.static/-/Library-Sites-library-shared/default/dwce20a91f/images/global/megamenu/SPRING%20LAUNCH%202026/290126_SPRINGLAUNCH_Nav_WW_DT.jpg",
  "all saints": "https://www.allsaints.com/on/demandware.static/-/Library-Sites-library-shared/default/dwce20a91f/images/global/megamenu/SPRING%20LAUNCH%202026/290126_SPRINGLAUNCH_Nav_WW_DT.jpg",
  "zadig & voltaire": "https://images.prismic.io/zadig-et-voltairecom/aZdF7cFoBIGEgkcN_Desk-Bloc-1512x2160-MARO.jpg?auto=format",
  "margaret howell": "https://www.margarethowell.co.uk/cdn/shop/files/margaret-howell-ss26-campaign-1307x1888-03.jpg?v=1770051486&width=1320",
  "joseph": "https://joseph-fashion.com/cdn/shop/files/Look_01_Joseph_AW26_4034.jpg?crop=center&height=1500&v=1771617269&width=1000",
  "ami paris": "https://a.storyblok.com/f/283537/1440x900/8b19363fc4/hp_outerwear_hero_desktop.jpg/m/1200x0/filters:quality(80)",
  "citizens of humanity": "https://citizensofhumanity.com/cdn/shop/files/BANNER-MOONLIGHT-2.jpg?v=1771532018&width=1500",
  "rag & bone": "https://www.rag-bone.com/dw/image/v2/BGGC_PRD/on/demandware.static/-/Library-Sites-ragandbone-content-global/default/dw248011c6/homepage_2026/February/0217_February_1.jpg?sw=1200",
  "equipment": "https://cdn.merchantly.com/asset/5453/5/optimized_5.14_EQ_HPFlip_SlotA_D_1x.jpg",
  "ted baker": "https://www.tedbaker.com/cdn/shop/files/282526_NAVY_1.jpg?v=1762809952&width=495",
  "vince": "https://www.vince.com/on/demandware.static/-/Library-Sites-RefArchSharedLibrary/default/dwb6aa9114/W_3-Pants_225x175.jpg",
  "sézane": "https://media.sezane.com/image/upload/c_crop,fl_progressive:semi,h_1,q_auto:best,w_0.97902097902098,x_0.01048951048951,y_0/c_scale,w_963/y0zn0hnuuwmmmnfti8kj.jpg",
  "sezane": "https://media.sezane.com/image/upload/c_crop,fl_progressive:semi,h_1,q_auto:best,w_0.97902097902098,x_0.01048951048951,y_0/c_scale,w_963/y0zn0hnuuwmmmnfti8kj.jpg",
  "reformation": "https://www.thereformation.com/on/demandware.static/-/Sites-reformation-us-Library/default/dw80c371e3/images/prints/floral.jpg",
};

export function getBrandHeroImage(brandName: string): string | null {
  const lower = brandName.toLowerCase().trim();

  if (BRAND_HERO_IMAGES[lower]) {
    return BRAND_HERO_IMAGES[lower];
  }

  return null;
}
