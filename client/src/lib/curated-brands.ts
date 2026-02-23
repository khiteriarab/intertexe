export const CURATED_BRAND_SLUGS = [
  "khaite",
  "anine-bing",
  "toteme",
  "frame",
  "vince",
  "rag-bone",
  "nanushka",
  "sandro",
  "theory",
  "max-mara",
  "the-kooples",

  "eileen-fisher",
  "a-p-c-",
  "cos",
  "arket",
  "equipment",
  "nili-lotan",
  "filippa-k",
  "joseph",
  "margaret-howell",
  "citizens-of-humanity",
  "agolde",
  "ami-paris",

  "the-row",
  "brunello-cucinelli",
  "loro-piana",
  "jil-sander",
  "lemaire",
  "bottega-veneta",
  "chloe",
  "loewe",
  "stella-mccartney",
  "acne-studios",

  "reformation",
  "everlane",
  "other-stories",
  "massimo-dutti",
  "re-done",
  "quince",

  "ba-sh",
  "sezane",
  "ganni",
  "isabel-marant",
  "jacquemus",
  "zimmermann",
  "proenza-schouler",
  "maje",
  "iro",
  "zadig-voltaire",
  "allsaints",
  "reiss",
  "club-monaco",
  "ted-baker",
  "claudie-pierlot",
];

const CURATED_BRAND_NAMES = new Set([
  "khaite", "anine bing", "totême", "toteme", "frame", "vince",
  "rag & bone", "nanushka", "sandro", "theory", "max mara",
  "the kooples",
  "eileen fisher", "a.p.c.", "cos", "arket", "equipment",
  "nili lotan", "filippa k", "joseph", "margaret howell",
  "citizens of humanity", "agolde", "ami paris",
  "the row", "brunello cucinelli", "loro piana", "jil sander",
  "lemaire", "bottega veneta", "chloé", "chloe", "loewe",
  "stella mccartney", "acne studios",
  "reformation", "everlane", "& other stories", "massimo dutti",
  "re/done", "quince",
  "ba&sh", "sézane", "sezane", "ganni", "isabel marant",
  "jacquemus", "zimmermann", "proenza schouler", "maje", "iro",
  "zadig & voltaire", "allsaints", "all saints", "reiss",
  "club monaco", "ted baker", "claudie pierlot",
]);

export function filterToCuratedBrands(designers: any[]): any[] {
  const slugSet = new Set(CURATED_BRAND_SLUGS);
  const matched = designers.filter((d: any) =>
    slugSet.has(d.slug) || CURATED_BRAND_NAMES.has((d.name || '').toLowerCase().trim())
  );

  const seen = new Set<string>();
  const deduped = matched.filter((d: any) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  return deduped.length > 0 ? deduped : designers.slice(0, 24);
}
