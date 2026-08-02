/**
 * Deployment / CI gate for background jobs.
 *
 * Fails if:
 * - vercel.json cron set ≠ registry scheduled jobs
 * - any cron missing cost-review fields
 * - warm cron is scheduled
 * - warm route targets forbidden expensive endpoints
 * - WARM_CRON_ENABLED default is not 0 in job-guard
 * - too many jobs share an identical schedule
 * - monthly invocation estimate exceeds founder-review ceiling
 *
 * Run: npm run check:background-jobs
 * Also runs automatically on `npm run build` (Vercel production deploys).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_CRON_BASELINE,
  BACKGROUND_JOBS,
  expectedVercelCrons,
  MAX_MONTHLY_INVOCATIONS_WITHOUT_FOUNDER_REVIEW,
  totalExpectedMonthlyInvocations,
} from "../lib/background-jobs/registry.ts";
import {
  assertWarmRoutesAllowed,
  WARM_FORBIDDEN_PATH_PREFIXES,
} from "../lib/background-jobs/warm-policy.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

type CronEntry = { path: string; schedule: string };

function fail(msg: string): never {
  console.error(`\n[background-jobs] FAIL: ${msg}\n`);
  process.exit(1);
}

function loadVercelCrons(): CronEntry[] {
  const raw = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  const crons = Array.isArray(raw.crons) ? raw.crons : [];
  return crons.map((c: { path?: string; schedule?: string }) => ({
    path: String(c.path || ""),
    schedule: String(c.schedule || ""),
  }));
}

function fingerprint(crons: CronEntry[]): string {
  return crons
    .map((c) => `${c.path}|${c.schedule}`)
    .sort()
    .join("\n");
}

function checkRegistryCompleteness() {
  for (const job of BACKGROUND_JOBS) {
    if (!job.purpose?.trim()) fail(`Job ${job.id} missing purpose`);
    if (!job.owner) fail(`Job ${job.id} missing owner`);
    if (!job.estimatedRuntime?.trim()) fail(`Job ${job.id} missing estimatedRuntime`);
    if (job.expectedDailyExecutions == null) fail(`Job ${job.id} missing expectedDailyExecutions`);
    if (job.expectedMonthlyInvocations == null) {
      fail(`Job ${job.id} missing expectedMonthlyInvocations`);
    }
    if (!job.justification || job.justification.trim().length < 20) {
      fail(`Job ${job.id} missing cost-review justification (min 20 chars)`);
    }
    if (typeof job.productionSafe !== "boolean") {
      fail(`Job ${job.id} missing productionSafe`);
    }
    if (
      job.scheduledInProduction &&
      job.expectedMonthlyInvocations > MAX_MONTHLY_INVOCATIONS_WITHOUT_FOUNDER_REVIEW
    ) {
      fail(
        `Job ${job.id} estimates ${job.expectedMonthlyInvocations}/mo — exceeds ${MAX_MONTHLY_INVOCATIONS_WITHOUT_FOUNDER_REVIEW}. Founder review required.`
      );
    }
  }
}

function checkVercelMatchesRegistry() {
  const actual = loadVercelCrons();
  const expected = expectedVercelCrons();
  const a = fingerprint(actual);
  const e = fingerprint(expected);
  if (a !== e) {
    console.error("[background-jobs] vercel.json crons:\n" + a);
    console.error("[background-jobs] registry expected:\n" + e);
    fail(
      "vercel.json crons do not match lib/background-jobs/registry.ts. Update the registry (with cost-review fields) in the same PR — never add crons only to vercel.json."
    );
  }

  if (actual.some((c) => c.path.includes("/api/cron/warm"))) {
    fail("/api/cron/warm is scheduled in vercel.json — forbidden after cost incident.");
  }

  for (const c of actual) {
    const starSlash = c.schedule.match(/^\*\/(\d+)\s/);
    if (starSlash) {
      const n = Number(starSlash[1]);
      if (n < 6) {
        fail(
          `Cron ${c.path} schedule "${c.schedule}" is more frequent than every 6 hours — forbidden without founder review.`
        );
      }
    }
    if (
      c.schedule === "*/1 * * * *" ||
      c.schedule === "*/2 * * * *" ||
      c.schedule === "*/5 * * * *" ||
      c.schedule === "* * * * *"
    ) {
      fail(`Cron ${c.path} schedule "${c.schedule}" is a high-frequency polling schedule — forbidden.`);
    }
  }
}

function checkWarmRouteSource() {
  const warmPath = join(root, "app/api/cron/warm/route.ts");
  if (!existsSync(warmPath)) return;
  const src = readFileSync(warmPath, "utf8");

  if (!src.includes("warmCronEnabled")) {
    fail("warm route must gate on warmCronEnabled()");
  }

  for (const prefix of WARM_FORBIDDEN_PATH_PREFIXES) {
    if (src.includes(`"${prefix}`) || src.includes(`'${prefix}`) || src.includes(`\`${prefix}`)) {
      fail(
        `warm/route.ts references forbidden warm target "${prefix}". Only /api/health may be warmed.`
      );
    }
  }

  const arrayMatch = src.match(/const routes\s*=\s*\[([\s\S]*?)\]/);
  if (arrayMatch) {
    const routes = [...arrayMatch[1].matchAll(/["'`](\/api\/[^"'`]+)["'`]/g)].map((m) => m[1]);
    if (routes.length) {
      const result = assertWarmRoutesAllowed(routes);
      if (!result.ok) {
        fail(`warm route targets forbidden endpoints: ${result.forbidden.join(", ")}`);
      }
    }
  }

  // Spread from allow-list is fine; ensure WARM_ALLOWED_PATHS is used
  if (!src.includes("WARM_ALLOWED_PATHS") && !src.includes("/api/health")) {
    fail("warm route must use WARM_ALLOWED_PATHS or only /api/health");
  }
}

function checkJobGuardDefaults() {
  const guard = readFileSync(join(root, "lib/job-guard.ts"), "utf8");
  if (!/WARM_CRON_ENABLED\s*\?\?\s*["']0["']/.test(guard)) {
    fail('lib/job-guard.ts must default WARM_CRON_ENABLED to "0"');
  }
}

function checkNoBackgroundLoopsInCronRoutes() {
  const cronRoot = join(root, "app/api/cron");
  const offenders: string[] = [];
  function walk(dir: string) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name === "route.ts") {
        const src = readFileSync(p, "utf8");
        if (/setInterval\s*\(/.test(src)) {
          offenders.push(`${p.replace(root + "/", "")} (setInterval)`);
        }
        if (
          (/while\s*\(\s*true\s*\)/.test(src) || /for\s*\(\s*;\s*;\s*\)/.test(src)) &&
          !src.includes("hardStop") &&
          !src.includes("maxRounds")
        ) {
          offenders.push(p.replace(root + "/", ""));
        }
      }
    }
  }
  walk(cronRoot);
  if (offenders.length) {
    fail(`Background loops detected in cron routes: ${offenders.join(", ")}`);
  }
}

function checkOverlappingSchedules() {
  const crons = loadVercelCrons();
  const bySchedule = new Map<string, string[]>();
  for (const c of crons) {
    const list = bySchedule.get(c.schedule) || [];
    list.push(c.path);
    bySchedule.set(c.schedule, list);
  }
  for (const [schedule, paths] of bySchedule) {
    if (paths.length > 3) {
      fail(
        `Schedule "${schedule}" runs ${paths.length} jobs simultaneously (${paths.join(
          ", "
        )}). Split schedules to avoid overlapping Fluid instances.`
      );
    }
  }
}

function main() {
  console.log(
    `[background-jobs] baseline v${APPROVED_CRON_BASELINE.version} (${APPROVED_CRON_BASELINE.updatedAt})`
  );
  checkRegistryCompleteness();
  checkVercelMatchesRegistry();
  checkWarmRouteSource();
  checkJobGuardDefaults();
  checkNoBackgroundLoopsInCronRoutes();
  checkOverlappingSchedules();

  const monthly = totalExpectedMonthlyInvocations();
  console.log(
    `[background-jobs] OK — ${expectedVercelCrons().length} production crons, ~${monthly} expected monthly invocations`
  );
  console.log(`[background-jobs] ${APPROVED_CRON_BASELINE.note}`);
  console.log(`[background-jobs] Registered jobs: ${BACKGROUND_JOBS.length}`);
}

main();
