import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

for (const p of ['.env.local', '.env', '../.env']) {
  const full = path.resolve(process.cwd(), p);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: products } = await supabase
  .from('products')
  .select('id, name, brand_name, url, is_active')
  .eq('approved', 'yes')
  .eq('is_active', true)
  .not('url', 'is', null)
  .order('scan_count', { ascending: false })
  .limit(1000);

const results = { checked: 0, working: 0, broken: [], redirected: 0, timeout: 0 };

for (const product of (products || [])) {
  results.checked++;
  try {
    const response = await fetch(product.url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Intertexe/1.0)'
      }
    });

    if (response.status === 200) {
      results.working++;
    } else if (response.status === 404 || response.status === 410) {
      results.broken.push({
        id: product.id,
        name: product.name,
        brand: product.brand_name,
        status: response.status
      });
      await supabase
        .from('products')
        .update({ is_active: false, stock_status: 'unavailable' })
        .eq('id', product.id);
    } else {
      results.redirected++;
    }
  } catch {
    results.timeout++;
  }
  await new Promise((r) => setTimeout(r, 300));
}

console.log('AFFILIATE HEALTH CHECK RESULTS:', {
  checked: results.checked,
  working: results.working,
  broken: results.broken.length,
  redirected: results.redirected,
  timeout: results.timeout
});

if (results.broken.length > 0) {
  console.log('Broken links marked inactive:');
  results.broken.forEach((p) => console.log(`  ${p.brand} — ${p.name} (${p.status})`));
}
