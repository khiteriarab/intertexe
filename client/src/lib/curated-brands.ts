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
];

export function filterToCuratedBrands(designers: any[]): any[] {
  const slugSet = new Set(CURATED_BRAND_SLUGS);
  const matched = designers.filter((d: any) => slugSet.has(d.slug));
  if (matched.length >= 6) return matched;
  const nameSet = new Set(CURATED_BRAND_SLUGS.map(s => s.replace(/-/g, ' ').toLowerCase()));
  const byName = designers.filter((d: any) => {
    const name = (d.name || '').toLowerCase().trim();
    return nameSet.has(name) || CURATED_BRAND_SLUGS.some(slug => {
      const slugName = slug.replace(/-/g, ' ');
      return name.includes(slugName) || slugName.includes(name);
    });
  });
  const allMatched = [...matched, ...byName.filter(d => !matched.some(m => m.id === d.id))];
  return allMatched.length > 0 ? allMatched : designers.slice(0, 24);
}
