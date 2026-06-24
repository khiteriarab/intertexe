/**
 * Apply migration 20240021 (canonical + classification layer).
 * Requires DATABASE_URL (pooler recommended, 600s statement timeout).
 */
import fs from "fs";
import path from "path";
import pg from "pg";

const MIGRATION_FILE = "20240021_catalog_classification_layer.sql";

export function resolveClassificationMigrationSql(repoRoot?: string): string {
  const root = repoRoot || path.join(process.cwd(), "..");
  const candidates = [
    path.join(process.cwd(), "supabase", "migrations", MIGRATION_FILE),
    path.join(root, "supabase", "migrations", MIGRATION_FILE),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
}

export async function applyClassificationMigration(opts?: {
  databaseUrl?: string;
}): Promise<{ ok: boolean; message: string; checks?: Record<string, unknown> }> {
  const dbUrl = opts?.databaseUrl || process.env.DATABASE_URL;
  if (!dbUrl) {
    return { ok: false, message: "DATABASE_URL not set" };
  }

  const sql = resolveClassificationMigrationSql();
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 600_000,
  });

  await client.connect();
  try {
    await client.query(sql);
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    const v = await client.query(`
      SELECT
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'catalog_style_key') AS has_style_key,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canonical_products') AS has_canonical_table,
        (SELECT COUNT(*)::bigint FROM public.canonical_products) AS canonical_count,
        (SELECT COUNT(*)::bigint FROM public.products WHERE canonical_id IS NOT NULL) AS linked_offers;
    `);
    return { ok: true, message: "classification migration applied", checks: v.rows[0] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  } finally {
    await client.end();
  }
}
