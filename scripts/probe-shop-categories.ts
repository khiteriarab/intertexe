import fs from "node:fs";
import { queryLiveCatalog } from "../lib/catalog-direct-query";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env.development.local");
loadEnvFile(".env.local");

const cats = [
  "swimwear",
  "shorts",
  "lingerie",
  "tanks",
  "matching-sets",
  "tops",
  "knitwear",
  "outerwear",
  "dresses",
  "jeans",
  "sleepwear",
  "jumpsuits",
  "skirts",
  "coats",
  "jackets",
  "trousers",
  "shirts",
  "blouses",
  "clothing",
];

for (const c of cats) {
  const t0 = Date.now();
  const r = await queryLiveCatalog({
    region: "us",
    category: c,
    limit: 3,
    offset: 0,
    skipCount: true,
  });
  console.log(
    c.padEnd(14),
    "n=" + r.products.length,
    "rpc=" + (r.rpcVersion ?? "?"),
    "err=" + (r.error ?? ""),
    "ms=" + (Date.now() - t0)
  );
}
