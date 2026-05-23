/**
 * Rebuild collection_product_memberships from full catalog_list scans.
 * Run after migration 20240034 and nightly alongside rail refresh.
 *
 *   cd intertexe-website && npx tsx scripts/refresh-collection-memberships.ts
 *   npx tsx scripts/refresh-collection-memberships.ts vacation
 */
import fs from "fs";
import path from "path";

function loadEnv() {
  for (const f of [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", ".env"),
  ]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();

async function main() {
  const slug = process.argv[2] as import("../lib/collection-pages").CollectionSlug | undefined;
  const { refreshCollectionMemberships } = await import("../lib/collection-memberships");
  const counts = await refreshCollectionMemberships(slug);
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
