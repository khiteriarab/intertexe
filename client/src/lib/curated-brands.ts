export const CURATED_BRAND_SLUGS = [
  "ba-sh",
  "sezane",
  "reformation",
  "ganni",
  "isabel-marant",
  "khaite",
  "jacquemus",
  "zimmermann",
  "anine-bing",
  "toteme",
  "nanushka",
  "frame",
  "agolde",
  "re-done",
  "vince",
  "cos",
  "theory",
  "club-monaco",
  "reiss",
  "sandro",
  "maje",
  "iro",
  "zadig-voltaire",
  "all-saints",
  "ted-baker",
  "max-mara",
  "stella-mccartney",
  "acne-studios",
  "proenza-schouler",
  "the-row",
  "chloe",
  "loewe",
  "bottega-veneta",
  "brunello-cucinelli",
  "loro-piana",
  "jil-sander",
  "lemaire",
  "ami-paris",
  "a-p-c-",
  "equipment",
  "rag-bone",
  "citizens-of-humanity",
  "eileen-fisher",
  "margaret-howell",
  "joseph",
  "arket",
  "other-stories",
  "claudie-pierlot",
  "the-kooples",
];

const CURATED_BRAND_NAMES = new Set([
  "ba&sh", "sézane", "sezane", "reformation", "ganni", "isabel marant",
  "khaite", "jacquemus", "zimmermann", "anine bing", "totême", "toteme",
  "nanushka", "frame", "agolde", "re/done", "vince", "cos", "theory",
  "club monaco", "reiss", "sandro", "maje", "iro", "zadig & voltaire",
  "allsaints", "all saints", "ted baker", "max mara", "stella mccartney",
  "acne studios", "proenza schouler", "the row", "chloé", "chloe", "loewe",
  "bottega veneta", "brunello cucinelli", "loro piana", "jil sander",
  "lemaire", "ami paris", "a.p.c.", "equipment", "rag & bone",
  "citizens of humanity", "eileen fisher", "margaret howell", "joseph",
  "arket", "& other stories", "claudie pierlot", "the kooples",
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
