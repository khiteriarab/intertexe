/**
 * Apply 20260819_material_intelligence_api.sql (additive CREATE TABLE IF NOT EXISTS).
 * Used by the ops cron and the live release gate. Requires DATABASE_URL or exec_sql.
 */
import fs from "fs";
import path from "path";
import pg from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MATERIAL_INTELLIGENCE_MIGRATION_FILE = "20260819_material_intelligence_api.sql";

const REQUIRED_TABLES = [
  "material_api_clients",
  "material_api_keys",
  "material_api_usage",
  "material_snapshot_leads",
  "material_evidence",
] as const;

export function resolveDatabaseUrl(explicit?: string): string {
  return (
    explicit ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DIRECT_URL ||
    process.env.SUPABASE_DB_URL ||
    ""
  );
}

export function resolveMaterialIntelligenceSql(repoRoot?: string): string {
  const root = repoRoot || path.join(process.cwd(), "..");
  const candidates = [
    path.join(process.cwd(), "supabase", "migrations", MATERIAL_INTELLIGENCE_MIGRATION_FILE),
    path.join(root, "supabase", "migrations", MATERIAL_INTELLIGENCE_MIGRATION_FILE),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  throw new Error(`Migration file not found: ${MATERIAL_INTELLIGENCE_MIGRATION_FILE}`);
}

export function materialIntelligenceSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((part) =>
      part
        .split("\n")
        .filter((line) => !/^\s*--/.test(line))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

export async function materialIntelligenceTablesReady(opts?: {
  databaseUrl?: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: boolean; missing: string[]; via: string | null }> {
  const dbUrl = resolveDatabaseUrl(opts?.databaseUrl);
  if (dbUrl) {
    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      statement_timeout: 30_000,
    });
    await client.connect();
    try {
      const v = await client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
        [REQUIRED_TABLES]
      );
      const have = new Set(v.rows.map((r: { table_name: string }) => r.table_name));
      const missing = REQUIRED_TABLES.filter((t) => !have.has(t));
      return { ok: missing.length === 0, missing, via: "database_url" };
    } finally {
      await client.end();
    }
  }

  if (opts?.supabase) {
    const missing: string[] = [];
    for (const table of REQUIRED_TABLES) {
      const { error } = await opts.supabase.from(table).select("id").limit(1);
      if (error && /schema cache|does not exist|could not find/i.test(error.message)) {
        missing.push(table);
      }
    }
    return { ok: missing.length === 0, missing, via: "supabase" };
  }

  return { ok: false, missing: [...REQUIRED_TABLES], via: null };
}

function supabaseProjectRef(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  try {
    return new URL(url).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

async function applySqlWithPg(sql: string, databaseUrl: string): Promise<{ ok: boolean; message: string }> {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 600_000,
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    await client.query(sql);
    await notifyPostgrest(client);
    return { ok: true, message: "migration applied" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: message.replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@") };
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

async function applyViaDerivedPostgres(sql: string): Promise<{ ok: boolean; message: string; via: string }> {
  const ref = supabaseProjectRef();
  const password = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_DB_PASSWORD || "";
  if (!ref || !password) {
    return { ok: false, message: "no project ref or db credential", via: "derived_postgres" };
  }
  const enc = encodeURIComponent(password);
  const urls = [
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres?sslmode=no-verify`,
    `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify`,
    `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify`,
    `postgresql://postgres.${ref}:${enc}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=no-verify`,
    `postgresql://postgres.${ref}:${enc}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=no-verify`,
  ];
  const labels = ["direct", "pooler_east_tx", "pooler_east_session", "pooler_euwest", "pooler_eucentral"];
  const notes: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const result = await applySqlWithPg(sql, urls[i]);
    if (result.ok) return { ok: true, message: result.message, via: "derived_postgres" };
    notes.push(`${labels[i]}: ${result.message.split("\n")[0]}`);
  }
  return { ok: false, message: notes.join("; "), via: "derived_postgres" };
}

async function applyViaManagementApi(sql: string): Promise<{ ok: boolean; message: string; via: string }> {
  const ref = supabaseProjectRef();
  const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!ref || !token) {
    return { ok: false, message: "no management credential", via: "management_api" };
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      message: `HTTP ${res.status}`,
      via: "management_api",
    };
  }
  if (/error/i.test(text) && /permission|invalid|jwt/i.test(text)) {
    return { ok: false, message: "management query rejected", via: "management_api" };
  }
  return { ok: true, message: "migration applied", via: "management_api" };
}

async function notifyPostgrest(client: pg.Client) {
  await client.query(`NOTIFY pgrst, 'reload schema';`);
}

export async function applyMaterialIntelligenceMigration(opts?: {
  databaseUrl?: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: boolean; message: string; via?: string; checks?: Record<string, unknown> }> {
  const sql = resolveMaterialIntelligenceSql();
  const dbUrl = resolveDatabaseUrl(opts?.databaseUrl);

  if (dbUrl) {
    const applied = await applySqlWithPg(sql, dbUrl);
    if (!applied.ok) return { ok: false, message: applied.message, via: "database_url" };
    const ready = await materialIntelligenceTablesReady({ databaseUrl: dbUrl, supabase: opts?.supabase });
    if (!ready.ok) {
      return { ok: false, message: `tables missing: ${ready.missing.join(", ")}`, via: "database_url" };
    }
    return { ok: true, message: "migration applied", via: "database_url", checks: { tables: REQUIRED_TABLES } };
  }

  const derived = await applyViaDerivedPostgres(sql);
  if (derived.ok) {
    await new Promise((r) => setTimeout(r, 1500));
    const ready = await materialIntelligenceTablesReady({ supabase: opts?.supabase });
    if (!ready.ok) {
      return { ok: false, message: `tables missing after derived postgres: ${ready.missing.join(", ")}`, via: derived.via };
    }
    return { ok: true, message: derived.message, via: derived.via, checks: { tables: REQUIRED_TABLES } };
  }

  const managed = await applyViaManagementApi(sql);
  if (managed.ok) {
    await new Promise((r) => setTimeout(r, 1500));
    const ready = await materialIntelligenceTablesReady({ supabase: opts?.supabase });
    if (!ready.ok) {
      return { ok: false, message: `tables missing after management api: ${ready.missing.join(", ")}`, via: managed.via };
    }
    return { ok: true, message: managed.message, via: managed.via, checks: { tables: REQUIRED_TABLES } };
  }

  const prior = `derived_postgres: ${derived.message}; management_api: ${managed.message}`;

  if (opts?.supabase) {
    const statements = [...materialIntelligenceSqlStatements(sql), "NOTIFY pgrst, 'reload schema'"];
    for (const statement of statements) {
      const attempts = [{ sql: statement }, { query: statement }];
      let applied = false;
      let lastError = "";
      for (const args of attempts) {
        const { error } = await opts.supabase.rpc("exec_sql", args);
        if (!error) {
          applied = true;
          break;
        }
        lastError = error.message;
        if (/could not find the function/i.test(error.message)) {
          return { ok: false, message: `${prior}; exec_sql unavailable`, via: "exec_sql" };
        }
      }
      if (!applied) {
        return { ok: false, message: `${prior}; exec_sql: ${lastError || "failed"}`, via: "exec_sql" };
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
    const ready = await materialIntelligenceTablesReady({ supabase: opts.supabase });
    if (!ready.ok) {
      return { ok: false, message: `tables missing after exec_sql: ${ready.missing.join(", ")}`, via: "exec_sql" };
    }
    return { ok: true, message: "migration applied", via: "exec_sql", checks: { tables: REQUIRED_TABLES } };
  }

  return { ok: false, message: `${prior}; no supabase client` };
}
