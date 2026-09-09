#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { loadProjectEnv } from './lib/load-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);

const { queryLiveCatalog } = await import('../lib/catalog-direct-query.ts');

async function bench(label, opts) {
  const t0 = Date.now();
  const r = await queryLiveCatalog({ region: 'us', skipCount: true, ...opts });
  console.log(
    JSON.stringify({
      label,
      ms: Date.now() - t0,
      count: r.products.length,
      rpc: r.rpcVersion,
      error: r.error,
    })
  );
}

await bench('silk', { fiber: 'silk', limit: 24 });
await bench('shop', { limit: 48 });
await bench('dresses', { category: 'dresses', limit: 24 });
