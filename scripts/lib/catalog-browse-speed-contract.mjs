/**
 * Static contract for catalog browse RPC speed — shared by guard, apply-sql, and tests.
 * Prevents regressions like full card-dedupe + exact COUNT over entire categories.
 */
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../..");

export const CANONICAL_TAXONOMY_BROWSE_SQL = path.join(
  REPO_ROOT,
  "lib/sql/catalog_taxonomy_browse_page.sql"
);

export const GUARDED_FUNCTION = "catalog_taxonomy_browse_page";

/** Migrations that historically redefined the function — superseded by canonical. Do not re-apply. */
export const SUPERSEDED_MIGRATION_MARKERS = [
  "20260829_catalog_taxonomy_browse_price_hotfix.sql",
  "20260829_catalog_taxonomy_browse.sql",
  "20260829_catalog_taxonomy_browse_all_hotfix.sql",
  "20260829_catalog_taxonomy_browse_all_fast.sql",
  "20260829_catalog_taxonomy_qa_hardening.sql",
  "20260829_catalog_taxonomy_root_only.sql",
];

export const FORBIDDEN_PATTERNS = [
  {
    id: "full-filtered-count-cte",
    pattern: /counted\s+AS\s*\(\s*SELECT\s+count\(\*\)::bigint\s+AS\s+n\s+FROM\s+filtered/is,
    message:
      "Full COUNT(*) over a filtered CTE before paging — this caused 25–60s category timeouts.",
  },
  {
    id: "count-join-paged",
    pattern: /FROM\s+counted\s+c\s*\n?\s*LEFT\s+JOIN\s+LATERAL/is,
    message: "Exact count joined with paged rows — blocks first paint.",
  },
  {
    id: "eligible-then-filtered-scan",
    pattern: /eligible\s+AS\s*\([\s\S]{0,400}?filtered\s+AS\s*\(/is,
    message:
      "eligible→filtered full scan without v2 delegate — use catalog_browse_page_v2 for hot paths.",
  },
  {
    id: "card-dedupe",
    pattern: /catalog_card_dedupe|card_dedupe_key|dedupe_catalog_cards/is,
    message: "Card dedupe over full category is forbidden on browse hot paths.",
  },
];

export const REQUIRED_PATTERNS = [
  {
    id: "v2-delegate",
    pattern: /catalog_browse_page_v2\s*\(/,
    message: "Must delegate clothing/all and mappable leaves to catalog_browse_page_v2.",
  },
  {
    id: "clothing-all-fast-path",
    pattern: /is_all\s+THEN[\s\S]{0,120}?catalog_browse_page_v2/is,
    message: "clothing/all must bypass slow taxonomy SQL and call catalog_browse_page_v2.",
  },
  {
    id: "legacy-category-delegate",
    pattern: /legacy_cat\s+IS\s+NOT\s+NULL\s+THEN[\s\S]{0,120}?catalog_browse_page_v2/is,
    message: "Mappable leaf categories must delegate to catalog_browse_page_v2.",
  },
];

const FN_BODY_RE = new RegExp(
  `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${GUARDED_FUNCTION}\\s*\\([\\s\\S]*?\\)\\s*RETURNS[\\s\\S]*?AS\\s*\\$\\$([\\s\\S]*?)\\$\\$`,
  "i"
);

export function extractFunctionBody(sql) {
  const m = sql.match(FN_BODY_RE);
  return m ? m[1] : null;
}

export function definesGuardedFunction(sql) {
  return new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${GUARDED_FUNCTION}\\b`,
    "i"
  ).test(sql);
}

export function validateTaxonomyBrowseSql(sql, sourceLabel = "SQL") {
  const errors = [];
  const warnings = [];

  if (!definesGuardedFunction(sql)) {
    return { ok: true, errors, warnings, skipped: true };
  }

  const body = extractFunctionBody(sql);
  if (!body) {
    errors.push(`${sourceLabel}: could not parse ${GUARDED_FUNCTION} body`);
    return { ok: false, errors, warnings, skipped: false };
  }

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(sql)) {
      errors.push(`${sourceLabel}: [${rule.id}] ${rule.message}`);
    }
  }

  for (const rule of REQUIRED_PATTERNS) {
    if (!rule.pattern.test(sql)) {
      errors.push(`${sourceLabel}: missing [${rule.id}] ${rule.message}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, skipped: false };
}

export function normalizeSqlForHash(sql) {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function sha256Normalized(sql) {
  return createHash("sha256").update(normalizeSqlForHash(sql)).digest("hex");
}

export function readCanonicalTaxonomyBrowseSql() {
  return readFileSync(CANONICAL_TAXONOMY_BROWSE_SQL, "utf8");
}

export function findMigrationDefinitions() {
  const dir = path.join(REPO_ROOT, "supabase/migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const defs = [];
  for (const file of files) {
    const full = path.join(dir, file);
    const sql = readFileSync(full, "utf8");
    if (definesGuardedFunction(sql)) {
      defs.push({ file, full, sql });
    }
  }
  return defs;
}

export function findLastMigrationDefiningGuardedFunction() {
  const defs = findMigrationDefinitions();
  return defs.length ? defs[defs.length - 1] : null;
}

export function validateMigrationTimeline() {
  const defs = findMigrationDefinitions();
  const errors = [];
  const warnings = [];

  if (!defs.length) {
    return { ok: true, errors, warnings, lastFile: null, lastGood: null };
  }

  const last = defs[defs.length - 1];
  const lastCheck = validateTaxonomyBrowseSql(last.sql, `migration ${last.file}`);
  if (!lastCheck.ok) {
    errors.push(
      `Latest migration ${last.file} must be the fast canonical definition (see lib/sql/catalog_taxonomy_browse_page.sql).`
    );
    errors.push(...lastCheck.errors.map((e) => `  ${e}`));
  }

  let lastGood = null;
  for (const def of defs) {
    const check = validateTaxonomyBrowseSql(def.sql, def.file);
    if (check.ok) {
      lastGood = def.file;
    } else if (lastGood && def.file !== last.file) {
      warnings.push(
        `${def.file} is superseded by later fast migration(s) — never re-apply`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings, lastGood, lastFile: last.file };
}

export function validateRepoCatalogBrowseSpeed(opts = {}) {
  const { strictCanonicalHash = false } = opts;
  const errors = [];
  const warnings = [];
  const notes = [];

  const canonical = readCanonicalTaxonomyBrowseSql();
  const canonicalCheck = validateTaxonomyBrowseSql(canonical, "canonical lib/sql/catalog_taxonomy_browse_page.sql");
  if (!canonicalCheck.ok) {
    errors.push(...canonicalCheck.errors);
  } else {
    notes.push("canonical SQL passes speed contract");
  }

  const timeline = validateMigrationTimeline();
  if (!timeline.ok) {
    errors.push(...timeline.errors);
  } else {
    notes.push(
      timeline.lastFile
        ? `migration timeline OK — effective definition ${timeline.lastFile}`
        : "no migrations define catalog_taxonomy_browse_page (canonical file only)"
    );
  }
  warnings.push(...timeline.warnings);

  const lastMigration = findLastMigrationDefiningGuardedFunction();
  if (lastMigration) {
    const canonicalHash = sha256Normalized(extractFunctionBody(canonical) || "");
    const migrationHash = sha256Normalized(extractFunctionBody(lastMigration.sql) || "");
    if (canonicalHash !== migrationHash) {
      const msg = `canonical SQL body differs from latest migration ${lastMigration.file} — edit lib/sql/ only, then re-apply`;
      if (strictCanonicalHash) errors.push(msg);
      else warnings.push(msg);
    }
  }

  for (const marker of SUPERSEDED_MIGRATION_MARKERS) {
    const p = path.join(REPO_ROOT, "supabase/migrations", marker);
    try {
      const sql = readFileSync(p, "utf8");
      if (definesGuardedFunction(sql)) {
        const check = validateTaxonomyBrowseSql(sql, marker);
        if (!check.ok) {
          warnings.push(
            `${marker} contains a SLOW ${GUARDED_FUNCTION} definition (superseded — never re-apply this file)`
          );
        }
      }
    } catch {
      // file removed — fine
    }
  }

  return { ok: errors.length === 0, errors, warnings, notes };
}
