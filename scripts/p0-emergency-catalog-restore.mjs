#!/usr/bin/env node
/**
 * P0 restore + index rebuild via direct Postgres.
 * Reads connection from /tmp/p0-working-db.url (not committed).
 */
import fs from "fs";
import pg from "pg";

const url = fs.readFileSync("/tmp/p0-working-db.url", "utf8").trim();
const indexDefs = JSON.parse(
  fs.readFileSync("/tmp/displayable_indexdefs.json", "utf8")
);
const WORKERS = Number(process.env.RESTORE_WORKERS || 6);
const BATCH = Number(process.env.RESTORE_BATCH || 1000);
const FILL_BATCH = Number(process.env.RESTORE_FILL_BATCH || 5000);

const log = (...a) => console.log(new Date().toISOString(), ...a);

async function main() {
  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: WORKERS + 3,
    statement_timeout: 0,
    query_timeout: 0,
  });

  const client = await pool.connect();
  try {
    await client.query("SET synchronous_commit TO OFF");

    // Cancel leftover DDL
    const stuck = await client.query(`
      SELECT pid FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
        AND query ILIKE '%CREATE INDEX%'
        AND datname = current_database()
    `);
    for (const row of stuck.rows) {
      await client.query(`SELECT pg_terminate_backend($1)`, [row.pid]);
      log("terminated", row.pid);
    }

    log("recreating displayable indexes first (customer browse)");
    for (const row of indexDefs) {
      const ddl = row.indexdef
        .replace(/^CREATE UNIQUE INDEX /, "CREATE UNIQUE INDEX IF NOT EXISTS ")
        .replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS ");
      const t0 = Date.now();
      try {
        await client.query(ddl);
        log("index_ok", row.indexname, `ms=${Date.now() - t0}`);
      } catch (e) {
        log("index_fail", row.indexname, e.message);
      }
    }

    await client.query(
      `ALTER TABLE products DISABLE TRIGGER trg_products_is_displayable`
    );
    await client.query(
      `ALTER TABLE products DISABLE TRIGGER trg_update_is_displayable`
    );
    log("triggers_disabled");

    await client.query(`
      CREATE TABLE IF NOT EXISTS _p0_restore_queue (
        id uuid PRIMARY KEY,
        done boolean NOT NULL DEFAULT false
      );
      CREATE INDEX IF NOT EXISTS _p0_restore_queue_pending_idx
        ON _p0_restore_queue (id) WHERE done = false;
    `);

    // Reset false-done
    await client.query(`
      UPDATE _p0_restore_queue q
      SET done = false
      FROM products p
      WHERE q.id = p.id AND q.done = true AND coalesce(p.is_active, true) IS NOT TRUE
    `);

    let filled = 0;
    for (let i = 0; i < 400; i++) {
      const r = await client.query(`
        INSERT INTO _p0_restore_queue (id)
        SELECT p.id
        FROM products p
        WHERE p.is_active = false
          AND coalesce(p.natural_fiber_percent, 0) >= 80
          AND p.composition IS NOT NULL AND length(btrim(p.composition)) > 0
          AND coalesce(p.stock_status, '') IN ('in_stock', 'low_stock')
          AND coalesce(p.gender_scope, '') NOT IN ('men', 'male', 'mens', 'boys')
          AND p.image_url IS NOT NULL AND length(btrim(p.image_url)) > 0
          AND NOT EXISTS (SELECT 1 FROM _p0_restore_queue q WHERE q.id = p.id)
        LIMIT ${FILL_BATCH}
        ON CONFLICT DO NOTHING
      `);
      filled += r.rowCount || 0;
      log(`fill ${i + 1} +${r.rowCount || 0} total_fill=${filled}`);
      if (!r.rowCount) break;
    }

    const q = await client.query(`
      SELECT count(*)::int AS n, count(*) FILTER (WHERE NOT done)::int AS pending
      FROM _p0_restore_queue
    `);
    log("queue", q.rows[0]);
  } finally {
    client.release();
  }

  let restored = 0;
  const worker = async (wid) => {
    const c = await pool.connect();
    try {
      await c.query("SET synchronous_commit TO OFF");
      for (;;) {
        await c.query("BEGIN");
        try {
          const claim = await c.query(
            `
            SELECT id FROM _p0_restore_queue
            WHERE done = false
            ORDER BY id
            LIMIT $1
            FOR UPDATE SKIP LOCKED
          `,
            [BATCH]
          );
          if (!claim.rowCount) {
            await c.query("COMMIT");
            break;
          }
          const ids = claim.rows.map((r) => r.id);
          await c.query(
            `
            UPDATE products
            SET is_active = true,
                approved = 'yes',
                is_displayable = true,
                updated_at = now()
            WHERE id = ANY($1::uuid[])
          `,
            [ids]
          );
          await c.query(
            `UPDATE _p0_restore_queue SET done = true WHERE id = ANY($1::uuid[])`,
            [ids]
          );
          await c.query("COMMIT");
          restored += ids.length;
          if (restored % (BATCH * WORKERS) < BATCH) {
            log(`progress≈${restored} w${wid}`);
          }
        } catch (e) {
          await c.query("ROLLBACK");
          log(`w${wid}_err`, e.message);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    } finally {
      c.release();
    }
  };

  const t0 = Date.now();
  log(`workers=${WORKERS} batch=${BATCH}`);
  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i + 1)));
  log(`updates_done restored=${restored} ms=${Date.now() - t0}`);

  const c2 = await pool.connect();
  try {
    try {
      await c2.query(
        `DROP TRIGGER IF EXISTS trg_update_is_displayable ON products`
      );
      log("dropped_duplicate_trigger");
    } catch (e) {
      log("dup_trig", e.message);
    }
    await c2.query(
      `ALTER TABLE products ENABLE TRIGGER trg_products_is_displayable`
    );
    // if duplicate still exists, enable it too
    try {
      await c2.query(
        `ALTER TABLE products ENABLE TRIGGER trg_update_is_displayable`
      );
    } catch (_) {}

    try {
      await c2.query(`SELECT refresh_homepage_feeds_v2()`);
      log("homepage_v2");
    } catch (e) {
      try {
        await c2.query(`SELECT refresh_homepage_feeds()`);
        log("homepage_v1");
      } catch (e2) {
        log("homepage_fail", e2.message);
      }
    }

    let displayable = null;
    let material = null;
    try {
      displayable = Number(
        (
          await c2.query(
            `SELECT count(*)::bigint AS n FROM products WHERE is_displayable IS TRUE`
          )
        ).rows[0].n
      );
    } catch (e) {
      log("disp_count", e.message);
    }
    try {
      material = Number(
        (
          await c2.query(
            `SELECT count(*)::bigint AS n FROM catalog_material_price_browse`
          )
        ).rows[0].n
      );
    } catch (e) {
      log("mat_count", e.message);
    }

    await c2.query(
      `
      INSERT INTO system_status (key, value_json, updated_at) VALUES
        ('catalog_incident_p0', $1::jsonb, now()),
        ('catalog_last_known_good', $2::jsonb, now())
      ON CONFLICT (key) DO UPDATE
      SET value_json = EXCLUDED.value_json, updated_at = now()
    `,
      [
        JSON.stringify({
          status: "restore_complete",
          restored,
          displayable,
          materialBrowse: material,
          finishedAt: new Date().toISOString(),
        }),
        JSON.stringify({
          displayable,
          capturedAt: new Date().toISOString(),
          source: "p0_direct_pg_restore",
        }),
      ]
    );

    log(JSON.stringify({ done: true, restored, displayable, material }));
  } finally {
    c2.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
