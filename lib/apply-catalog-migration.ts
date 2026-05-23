/**
 * Apply migration 20240034 (collection memberships + sale/collection RPCs).
 * Used by cron route and ops scripts; requires DATABASE_URL (pooler recommended).
 */
import fs from "fs";
import path from "path";
import pg from "pg";

const MIGRATION_FILE = "20240034_collection_memberships_and_sale_catalog.sql";

export function resolveMigrationSql(repoRoot?: string): string {
  const root = repoRoot || path.join(process.cwd(), "..");
  const candidates = [
    path.join(process.cwd(), "supabase", "migrations", MIGRATION_FILE),
    path.join(root, "supabase", "migrations", MIGRATION_FILE),
    path.join(process.cwd(), "lib", "sql", MIGRATION_FILE),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
}

export async function applyCatalogMigration(opts?: { databaseUrl?: string }): Promise<{
  ok: boolean;
  message: string;
  checks?: Record<string, unknown>;
}> {
  const dbUrl = opts?.databaseUrl || process.env.DATABASE_URL;
  if (!dbUrl) {
    return { ok: false, message: "DATABASE_URL not set" };
  }

  const sql = resolveMigrationSql();
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
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collection_product_memberships') AS has_memberships,
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sale_catalog_count') AS has_sale_count,
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'collection_catalog_list') AS has_collection_list;
    `);
    return { ok: true, message: "migration applied", checks: v.rows[0] };
  } finally {
    await client.end();
  }
}
