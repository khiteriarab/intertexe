#!/usr/bin/env node
/**
 * Golden-path smoke checks for storefront + alert pipelines.
 * Usage: BASE_URL=https://www.intertexe.com CRON_SECRET=... node scripts/golden-path-smoke.mjs
 */
const base = (process.env.BASE_URL || "https://www.intertexe.com").replace(/\/$/, "");
const cronSecret = process.env.CRON_SECRET || "";

const checks = [];

async function get(path, opts = {}) {
  const res = await fetch(`${base}${path}`, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep null
  }
  return { status: res.status, text, json };
}

async function main() {
  checks.push(["homepage", await get("/api/homepage/rails?limit=4")]);
  checks.push(["catalog health", await get("/api/catalog/health")]);
  if (cronSecret) {
    checks.push([
      "price-drop alerts",
      await get("/api/notifications/price-drops", {
        headers: { Authorization: `Bearer ${cronSecret}` },
      }),
    ]);
  }

  let failed = 0;
  for (const [name, result] of checks) {
    const ok = result.status >= 200 && result.status < 300;
    console.log(`${ok ? "PASS" : "FAIL"}\t${name}\tHTTP ${result.status}`);
    if (!ok) {
      failed++;
      console.log(result.text.slice(0, 400));
    } else if (result.json && typeof result.json === "object") {
      const summary = JSON.stringify(
        Object.fromEntries(
          Object.entries(result.json).filter(([k]) =>
            ["personalized", "eligible", "emailed", "pushed", "checked", "ok"].includes(k)
          )
        )
      );
      if (summary !== "{}") console.log(`  ${summary}`);
    }
  }

  if (!cronSecret) {
    console.log("SKIP\tprice-drop alerts\t(set CRON_SECRET to exercise alert cron)");
  }

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
