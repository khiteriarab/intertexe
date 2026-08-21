/**
 * Bounded orphan check for static SEO routes.
 * Does not query the product catalog.
 * Run: node --import tsx scripts/seo-orphan-audit.ts
 */
import { readFileSync } from "node:fs";
import { staticIndexablePaths } from "../lib/seo-sitemaps.ts";
import { GUIDE_PAGES } from "../lib/seo-guides.ts";

const LINK_SOURCES = [
  "app/components/Footer.tsx",
  "app/guides/page.tsx",
  "lib/seo-guides.ts",
  "app/materials/page.tsx",
  "app/about/page.tsx",
  "app/methodology/page.tsx",
];

function extractHrefs(source: string): string[] {
  const hrefs = new Set<string>();
  const re = /href=["'`](\/[^"'`?#]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) hrefs.add(match[1]);
  return [...hrefs];
}

const linked = new Set<string>(["/"]);
for (const file of LINK_SOURCES) {
  try {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const href of extractHrefs(text)) linked.add(href);
  } catch {
    /* missing file */
  }
}
for (const guide of GUIDE_PAGES) {
  linked.add(`/guides/${guide.slug}`);
  for (const rel of guide.related) linked.add(rel.href);
}

const staticPaths = staticIndexablePaths();
const weaklyLinked = staticPaths.filter((path) => path !== "/" && !linked.has(path));

console.log(`Static indexable paths: ${staticPaths.length}`);
console.log(`Linked from seed files: ${linked.size}`);
if (weaklyLinked.length) {
  console.log("Weakly linked static paths (not a catalog scan):");
  for (const path of weaklyLinked) console.log(`  ${path}`);
  process.exitCode = 0;
} else {
  console.log("All static indexable paths appear in the seed link set.");
}
