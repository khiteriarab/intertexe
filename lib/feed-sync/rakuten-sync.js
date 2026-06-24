import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import { Client as FtpClient } from 'basic-ftp';
import { execSync } from 'child_process';
import { PassThrough, Readable } from 'stream';
import { createGunzip, gunzipSync } from 'zlib';
import { classifyGarment } from '../catalog-rules.js';
import { extractColorFromName } from './color-from-name.js';

const NATURAL_FIBERS = ['cotton', 'linen', 'silk', 'wool', 'cashmere', 'alpaca', 'mohair', 'hemp', 'ramie', 'leather', 'suede'];
const DEFAULT_BATCH_SIZE = parseInt(process.env.FEED_SYNC_BATCH_SIZE || '100', 10);
const INACTIVE_CHUNK_SIZE = 500;

const MYTHERESA_MIDS = new Set([
  '35663',  // mytheresa.com EU/UK/ME
  '43172',  // mytheresa.com US/CA
  '43654',  // mytheresa.com UK (Rakuten MID)
  'mytheresa',
  'mytheresa.com',
]);

const VERONICA_BEARD_CA_MIDS = new Set([
  '52963',
]);

// MID → forced currency/region (overrides feed-level XML values)
const MID_CURRENCY_MAP = {
  '35663': { currency: 'EUR', region: 'eu', retailerCountry: 'DE' }, // Mytheresa EU/UK/ME
  '43172': { currency: 'USD', region: 'us', retailerCountry: 'US' }, // Mytheresa US/CA — CA resolved per row
  '43654': { currency: 'GBP', region: 'uk', retailerCountry: 'GB' },
  // Veronica Beard Canada: force region/country, preserve feed currency when present.
  '52963': { region: 'us', retailerCountry: 'CA' },
};

const MYTHERESA_BRAND_FIELD_KEYS = [
  'brand',
  'brand_name',
  'designer',
  'designer_name',
  'label',
  'advertiser_name',
  'merchant_name',
  'google_custom_label_0',
  'custom_label_0',
  'product_type',
];

function isVeronicaBeardCanadaRow(row) {
  const mid = first(row, ['mid', 'merchant_id', 'advertiser_id', 'network_mid']);
  return VERONICA_BEARD_CA_MIDS.has(String(mid || '').trim());
}

function isMytheresaRow(row, feedUrl = '') {
  const mid = first(row, ['mid', 'merchant_id', 'advertiser_id', 'network_mid']);
  if (mid && MYTHERESA_MIDS.has(String(mid).trim().toLowerCase())) return true;
  if (feedUrl.toLowerCase().includes('mytheresa')) return true;
  const advertiser = String(first(row, ['advertiser_name', 'merchant_name']) || '').toLowerCase();
  return advertiser.includes('mytheresa');
}

async function withRetry(fn, retries = 3, delayMs = 500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isTransient = err.message?.includes('fetch failed') || err.message?.includes('ECONNRESET') || err.message?.includes('socket') || err.code === 'ETIMEDOUT'
        || err.code === '57014' || err.message?.includes('statement timeout') || err.message?.includes('canceling statement')
        || err.status === 429 || err.message?.includes('Too Many Requests');
      if (!isTransient || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
}

async function syncRakutenFeeds(options = {}) {
  const config = readConfig(options);
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
  const syncStartedAt = new Date().toISOString();
  let fetched = 0;
  let normalized = 0;
  let skippedOutOfScope = 0;
  let upserted = 0;
  let colorUpdatesApplied = 0;
  const errors = [];
  let filesProcessed = 0;
  let totalCatalogFiles = 0;
  const stats = {
    totalProcessed: 0,
    newProducts: 0,
    updatedProducts: 0,
    nowApproved: 0,
    rejected: 0,
    missingComposition: 0,
    skippedOutOfScope: 0,
    errors: [],
  };

  if (config.fileOffset === 0) {
    try {
      await supabase.from('system_status').upsert({
        key: 'rakuten_feed_sync_cycle',
        value_json: { cycleStartedAt: syncStartedAt },
        updated_at: syncStartedAt,
      });
    } catch (cycleErr) {
      errors.push({ feedUrl: 'cycle_start', message: cycleErr.message });
    }
  }

  async function processRows(rows, sourceUrl) {
    fetched += rows.length;
    const products = [];
    const colorCandidates = [];
    const COLOR_FLUSH_SIZE = 500;

    for (const row of rows) {
      const gateFields = extractRowGateFields(row, sourceUrl);
      const exclusion = consumerExclusionReason(gateFields);
      if (exclusion === 'missing_composition') {
        stats.missingComposition += 1;
      }
      const product = normalizeRakutenProduct(row, sourceUrl);
      if (product) {
        products.push(product);
        stats.totalProcessed += 1;
      } else {
        skippedOutOfScope += 1;
        stats.skippedOutOfScope += 1;
        stats.rejected += 1;
        if (exclusion !== 'missing_composition') {
          continue;
        }
        const colorUpdate = extractColorUpdateCandidate(row, sourceUrl);
        if (!colorUpdate) continue;
        colorCandidates.push(colorUpdate);
        if (colorCandidates.length >= COLOR_FLUSH_SIZE) {
          colorUpdatesApplied += await applyColorUpdates(
            supabase,
            config.productsTable,
            colorCandidates.splice(0, colorCandidates.length)
          );
        }
      }
    }
    normalized += products.length;

    // Fields managed by humans/editorial — never overwrite on re-sync.
    // `approved` is feed-driven: stale pending rows must be re-evaluated when composition/NFP improves.
    const CURATED_FIELDS = new Set(['tags', 'collection_slugs', 'editorial_categories', 'matching_set_id', 'added_at']);

    for (const batch of chunk(products, config.batchSize)) {
      const productIds = batch.map((p) => p.product_id);

      // Find which products already exist (to preserve their curated fields)
      const { data: existing } = await withRetry(async () => {
        const result = await supabase
          .from(config.productsTable)
          .select('product_id')
          .in('product_id', productIds);
        if (result.error) throw result.error;
        return result;
      });

      const existingIds = new Set((existing || []).map((r) => r.product_id));

      // New products: insert with all fields including computed approved/tags
      const newProducts = batch.filter((p) => !existingIds.has(p.product_id));
      if (newProducts.length > 0) {
        await withRetry(async () => {
          const { error } = await supabase.from(config.productsTable).insert(newProducts);
          if (error) throw error;
        });
        upserted += newProducts.length;
        stats.newProducts += newProducts.length;
        stats.nowApproved += newProducts.filter((p) => p.approved === 'yes').length;
      }

      // Existing products: upsert feed-driven fields (including approved / NFP / is_active)
      const updateProducts = batch
        .filter((p) => existingIds.has(p.product_id))
        .map((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !CURATED_FIELDS.has(k))));

      if (updateProducts.length > 0) {
        await withRetry(async () => {
          const { error } = await supabase
            .from(config.productsTable)
            .upsert(updateProducts, { onConflict: 'product_id', ignoreDuplicates: false });
          if (error) throw error;
        });
        upserted += updateProducts.length;
        stats.updatedProducts += updateProducts.length;
        stats.nowApproved += updateProducts.filter((p) => p.approved === 'yes').length;
      }
    }

    if (colorCandidates.length) {
      colorUpdatesApplied += await applyColorUpdates(
        supabase,
        config.productsTable,
        colorCandidates
      );
    }
  }

  if (config.hasFtp) {
    try {
      const ftpResult = await fetchRakutenFTP(config, errors, async ({ rows, filename }) => {
        filesProcessed += 1;
        try {
          await processRows(rows, `ftp://${config.ftpHost}/${filename}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : typeof err === 'object' ? JSON.stringify(err) : String(err);
          errors.push({ feedUrl: filename, message });
        }
      });
      totalCatalogFiles = ftpResult.totalCatalogFiles;
    } catch (err) {
      errors.push({ feedUrl: `ftp://${config.ftpHost}`, message: err.message });
    }
  }

  for (const feedUrl of config.feedUrls) {
    try {
      const rows = await fetchRakutenFeed(feedUrl, config);
      await processRows(rows, feedUrl);
    } catch (error) {
      errors.push({ feedUrl, message: error.message });
    }
  }

  let inactiveMarked = 0;
  if (config.markInactive) {
    let cycleStartedAt = syncStartedAt;
    try {
      const { data: cycleRow } = await supabase
        .from('system_status')
        .select('value_json')
        .eq('key', 'rakuten_feed_sync_cycle')
        .maybeSingle();
      if (cycleRow?.value_json?.cycleStartedAt) {
        cycleStartedAt = cycleRow.value_json.cycleStartedAt;
      }
    } catch {
      // fall back to this run's syncStartedAt
    }
    inactiveMarked = await markInactiveProducts(supabase, config, cycleStartedAt);
  }

  let soldOutDeactivated = 0;
  try {
    soldOutDeactivated = await deactivateUnavailableProducts(supabase, config.productsTable);
  } catch (err) {
    errors.push({ feedUrl: 'deactivate_unavailable', message: err.message });
  }

  let stockStatusBackfilled = 0;
  try {
    stockStatusBackfilled = await backfillStockStatus(supabase, config.productsTable);
  } catch (err) {
    errors.push({ feedUrl: 'backfill_stock_status', message: err.message });
  }

  try {
    await supabase.from('system_status').upsert({
      key: 'rakuten_feed_sync',
      value_json: {
        syncStartedAt,
        fetched,
        normalized,
        skippedOutOfScope,
        upserted,
        colorUpdatesApplied,
        inactiveMarked,
        soldOutDeactivated,
        stockStatusBackfilled,
        errorCount: errors.length,
        fileOffset: config.fileOffset,
        fileLimit: config.fileLimit,
        filesProcessed,
        totalCatalogFiles,
        markInactive: config.markInactive,
        stats,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (statusErr) {
    errors.push({ feedUrl: 'system_status', message: statusErr.message });
  }

  stats.errors = errors.map((e) => e.message || String(e));
  try {
    await supabase.from('sync_logs').insert({
      run_at: new Date().toISOString(),
      stats,
      status: errors.length > 0 ? 'partial' : 'success',
      source: config.ftpDirFilter?.length ? `rakuten:${config.ftpDirFilter.join(',')}` : 'rakuten',
    });
  } catch (logErr) {
    errors.push({ feedUrl: 'sync_logs', message: logErr.message });
  }

  console.log('Sync complete:', JSON.stringify({ ...stats, upserted, inactiveMarked, errors: errors.length }, null, 2));

  if (config.markInactive) {
    try {
      console.log('Running designer sync...');
      execSync('node scripts/sync-designers-from-products.mjs', { stdio: 'inherit' });
      console.log('Designer sync complete.');
    } catch (designerSyncErr) {
      const message = designerSyncErr instanceof Error ? designerSyncErr.message : String(designerSyncErr);
      errors.push({ feedUrl: 'designer_sync', message });
    }
  }

  return {
    ok: errors.length === 0,
    syncStartedAt,
    fetched,
    normalized,
    skippedOutOfScope,
    upserted,
    colorUpdatesApplied,
    inactiveMarked,
    soldOutDeactivated,
    stockStatusBackfilled,
    fileOffset: config.fileOffset,
    fileLimit: config.fileLimit,
    filesProcessed,
    totalCatalogFiles,
    markInactive: config.markInactive,
    stats,
    errors
  };
}

function readConfig(options) {
  const supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = options.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const feedUrls = parseList(options.feedUrls || process.env.RAKUTEN_FEED_URLS || process.env.RAKUTEN_FEED_URL);
  const ftpUsername = options.ftpUsername || process.env.RAKUTEN_FTP_USERNAME || process.env.RAKUTEN_FTP_USER;
  const ftpPassword = options.ftpPassword || process.env.RAKUTEN_FTP_PASSWORD;
  const ftpHost = options.ftpHost || process.env.RAKUTEN_FTP_HOST || 'aftp.linksynergy.com';
  const hasFtp = Boolean(ftpUsername && ftpPassword);
  if (!supabaseUrl) throw new Error('SUPABASE_URL is required.');
  if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
  if (feedUrls.length === 0 && !hasFtp) throw new Error('RAKUTEN_FEED_URLS or RAKUTEN_FTP_USERNAME + RAKUTEN_FTP_PASSWORD are required.');
  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    feedUrls,
    ftpUsername,
    ftpPassword,
    ftpHost,
    hasFtp,
    productsTable: options.productsTable || process.env.SUPABASE_PRODUCTS_TABLE || 'products',
    batchSize: Number(options.batchSize || process.env.FEED_SYNC_BATCH_SIZE || DEFAULT_BATCH_SIZE),
    fileLimit: options.fileLimit != null ? Number(options.fileLimit) : null,
    fileOffset: Number(options.fileOffset || 0),
    markInactive: options.markInactive === true || (options.markInactive !== false && options.fileLimit == null),
    ftpDirFilter: options.ftpDirFilter != null
      ? (Array.isArray(options.ftpDirFilter) ? options.ftpDirFilter : parseList(options.ftpDirFilter))
      : (parseList(process.env.RAKUTEN_FTP_DIR_FILTER).length ? parseList(process.env.RAKUTEN_FTP_DIR_FILTER) : null),
    timeoutMs: Number(options.timeoutMs || process.env.FEED_SYNC_TIMEOUT_MS || 120000),
    authHeader: options.authHeader || process.env.RAKUTEN_AUTH_HEADER,
    bearerToken: options.bearerToken || process.env.RAKUTEN_ACCESS_TOKEN,
    username: options.username || process.env.RAKUTEN_USERNAME,
    password: options.password || process.env.RAKUTEN_PASSWORD
  };
}

async function fetchRakutenFTP(config, errors, onFile) {
  const ftpAccess = {
    host: config.ftpHost,
    port: 21,
    user: config.ftpUsername,
    password: config.ftpPassword,
    secure: false,
  };

  // Helper: create a fresh connected FTP client
  async function connect() {
    const c = new FtpClient(90000);
    c.ftp.verbose = false;
    c.ftp.passive = true;
    await c.access(ftpAccess);
    return c;
  }

  // Step 1: list catalog files — when ftpDirFilter is set, only scan those MIDs (avoids listing 150+ merchants).
  let catalogFiles = [];
  {
    const c = await connect();
    try {
      await c.cd('.');
      const allFiles = [];
      const dirFilter = config.ftpDirFilter?.length ? config.ftpDirFilter : null;

      if (dirFilter) {
        for (const mid of dirFilter) {
          try {
            const subList = await c.list(mid);
            for (const f of subList) allFiles.push({ ...f, dir: mid });
          } catch (err) {
            console.warn(`FTP: could not list ${mid}:`, err?.message || err);
          }
        }
        const topList = await c.list('.');
        for (const entry of topList) {
          if (entry.type === 2) continue;
          allFiles.push(entry);
        }
      } else {
        const topList = await c.list('.');
        for (const entry of topList) {
          if (entry.type === 2) {
            try {
              const subList = await c.list(entry.name);
              for (const f of subList) allFiles.push({ ...f, dir: entry.name });
            } catch { /* skip unreadable dirs */ }
          } else {
            allFiles.push(entry);
          }
        }
      }

      catalogFiles = allFiles.filter((f) => {
        const n = f.name.toLowerCase();
        if (n.includes('delta')) return false;
        if (n.includes('template')) return false;
        if (!(/\.(xml|txt|tsv|csv)(\.gz)?$/.test(n))) return false;
        if (config.ftpDirFilter && f.dir && !config.ftpDirFilter.includes(f.dir)) return false;
        if (config.ftpDirFilter && !f.dir) {
          // top-level file: include only if its name starts with a filtered MID
          return config.ftpDirFilter.some(mid => n.startsWith(mid));
        }
        return true;
      });
    } finally {
      c.close();
    }
  }

  const MAX_FILE_BYTES = 1000 * 1024 * 1024; // 1 GB compressed
  const totalCatalogFiles = catalogFiles.length;
  const sliceStart = config.fileOffset || 0;
  const sliceEnd = config.fileLimit != null ? sliceStart + config.fileLimit : totalCatalogFiles;
  catalogFiles = catalogFiles.slice(sliceStart, sliceEnd);
  console.log(`FTP: found ${totalCatalogFiles} catalog files, processing ${catalogFiles.length} (offset ${sliceStart})`);

  // Step 2: download and process each file with its own fresh FTP connection
  for (const file of catalogFiles) {
    if (file.size > MAX_FILE_BYTES) {
      console.warn(`FTP: skipping ${file.name} (${Math.round(file.size / 1024 / 1024)}MB > 1GB limit)`);
      continue;
    }
    const remotePath = file.dir ? `${file.dir}/${file.name}` : file.name;
    let client;
    try {
      client = await connect();
      const chunks = [];
      const stream = new PassThrough();
      stream.on('data', (chunk) => chunks.push(chunk));
      await client.downloadTo(stream, remotePath);
      client.close();
      client = null;

      const compressedBuffer = Buffer.concat(chunks);
      const isGzip = file.name.endsWith('.gz');
      const isXml = file.name.replace(/\.gz$/i, '').endsWith('.xml');
      let rows;

      if (isGzip && compressedBuffer.length > 5_000_000) {
        // Stream-decompress large files to avoid V8 string length limit
        // Parse incrementally — never join all chunks into one string
        rows = await new Promise((resolve, reject) => {
          const allRows = [];
          // tail = unprocessed text carried between gunzip data events.
          // NEVER grows beyond ~2 product blocks (~50KB) because we drain it each event.
          let tail = '';
          const delimitedParts = [];

          // Find next <product> or <product SPACE tag (not <productImage> etc.)
          function nextProductOpen(text, from) {
            let pos = from;
            while (pos < text.length) {
              const i = text.indexOf('<product', pos);
              if (i === -1) return -1;
              const c = text[i + 8]; // char after '<product'
              if (c === '>' || c === ' ' || c === '\n' || c === '\t' || c === '\r') return i;
              pos = i + 1;
            }
            return -1;
          }

          function drainProducts(text) {
            // Extract and process all complete outer <product>...</product> blocks.
            // Returns any incomplete trailing fragment.
            let start = 0;
            while (start < text.length) {
              const open = nextProductOpen(text, start);
              if (open === -1) return ''; // nothing left to keep
              let depth = 1, s = open + 1, close = -1;
              while (depth > 0 && s < text.length) {
                const no = nextProductOpen(text, s);
                const nc = text.indexOf('</product>', s);
                if (nc === -1) break;
                if (no !== -1 && no < nc) {
                  depth++;
                  s = no + 1;
                } else {
                  depth--;
                  if (depth === 0) close = nc;
                  s = nc + 1;
                }
              }
              if (close === -1) {
                // Incomplete product — keep from 'open' as tail
                return text.slice(open);
              }
              const endIdx = close + '</product>'.length;
              const xmlChunk = text.slice(open, endIdx);
              start = endIdx;

              // Fast pre-filter: skip without XML parse when clearly out of consumer scope
              const cl = xmlChunk.toLowerCase();
              if (!passesRakutenXmlPrefilter(cl)) continue;

              try {
                const p = (makeXMLParser().parse(xmlChunk)).product;
                if (p && p['@_product_id']) allRows.push(flattenRakutenXMLProduct(p));
              } catch { /* skip malformed */ }
            }
            return '';
          }

          const readable = Readable.from(compressedBuffer);
          const gunzip = createGunzip();
          readable.pipe(gunzip);

          gunzip.on('data', (rawChunk) => {
            if (!isXml) { delimitedParts.push(rawChunk.toString('utf-8')); return; }
            // Prepend only the small tail, not the whole history
            const text = tail + rawChunk.toString('utf-8');
            tail = drainProducts(text);
            // Safety: if tail grows beyond 50MB a product is malformed — discard it
            if (tail.length > 50_000_000) tail = '';
          });

          gunzip.on('end', () => {
            if (!isXml) { resolve(parseDelimited(delimitedParts.join(''))); return; }
            if (tail) drainProducts(tail + '</product>'); // attempt flush
            resolve(allRows);
          });
          gunzip.on('error', reject);
        });
      } else {
        const body = isGzip ? gunzipSync(compressedBuffer) : compressedBuffer;
        rows = isXml ? parseXML(body.toString('utf-8')) : parseDelimited(body.toString('utf-8'));
      }

      console.log(`FTP: ${remotePath} — ${rows.length} rows`);
      await onFile({ filename: remotePath, rows });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null
          ? JSON.stringify(err)
          : String(err);
      console.warn(`FTP file error ${file.name}: ${message}`);
      errors.push({ feedUrl: remotePath, message });
      if (client) { try { client.close(); } catch {} }
    }
  }

  return { totalCatalogFiles };
}

async function fetchRakutenFeed(feedUrl, config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const headers = {};
    if (config.authHeader) headers.Authorization = config.authHeader;
    if (config.bearerToken) headers.Authorization = `Bearer ${config.bearerToken}`;
    if (config.username && config.password) {
      headers.Authorization = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    }
    const response = await fetch(feedUrl, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`Rakuten feed failed ${response.status} ${response.statusText}`);
    const body = await response.text();
    return parseFeed(body, response.headers.get('content-type') || feedUrl);
  } finally {
    clearTimeout(timeout);
  }
}

function flattenRakutenXMLProduct(p) {
  if (!p || typeof p !== 'object') return p;
  const str = (v) => {
    if (v === undefined || v === null) return undefined;
    return String(v)
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
  };
  const attr = p.attributeClass || {};
  const secondary = str(p.category?.secondary);
  return {
    product_id:      str(p['@_product_id'] || p.product_id),
    name:            str(p['@_name'] || p.name),
    sku:             str(p['@_sku_number'] || p.sku_number || p.sku),
    upc:             str(p.upc),
    brand:           str(p.brand || p.manufacturer_name || p['@_manufacturer_name']),
    manufacturer:    str(p.manufacturer_name || p['@_manufacturer_name']),
    category:        str(p.category?.primary || p.category),
    secondary_category: secondary,
    product_url:     str(p.URL?.product || p.url),
    image_url:       str(p.URL?.productImage || p.image_url),
    description:     str(p.description?.long || p.description?.short || p.description),
    short_desc:      str(p.description?.short),
    price:           str(p.price?.retail || p.price?.sale || p.price),
    sale_price:      str(p.price?.sale),
    retail_price:    str(p.price?.retail),
    currency:        str(p.price?.['@_currency'] || p.price?.currency || 'USD'),
    availability:    str(p.shipping?.availability),
    mid:             str(p['@_mid'] || (String(p['@_product_id'] || '').slice(0, 5))),
    advertiser_id:   str(p['@_mid']),
    merchant_id:     str(p['@_mid'] || (String(p['@_product_id'] || '').slice(0, 5))),
    // Mytheresa attributeClass fields
    material:        str(attr.Material || attr.material),
    gender:          str(attr.Gender || attr.gender),
    product_type:    str(attr.Product_Type || attr.product_type),
    color:           str(attr.Color || attr.color),
    size:            str(attr.Size || attr.size),
  };
}

function makeXMLParser() {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: () => false,
    htmlEntities: false,
    processEntities: false,
    parseAttributeValue: false,
  });
}

function nextProdOpen(text, from) {
  let pos = from;
  while (pos < text.length) {
    const i = text.indexOf('<product', pos);
    if (i === -1) return -1;
    const c = text[i + 8];
    if (c === '>' || c === ' ' || c === '\n' || c === '\t' || c === '\r') return i;
    pos = i + 1;
  }
  return -1;
}

function parseXMLChunked(body) {
  const parser = makeXMLParser();
  const results = [];
  let pos = 0;
  while (pos < body.length) {
    const open = nextProdOpen(body, pos);
    if (open === -1) break;
    let depth = 1;
    let search = open + 1;
    let close = -1;
    while (depth > 0 && search < body.length) {
      const nextOpen  = nextProdOpen(body, search);
      const nextClose = body.indexOf('</product>', search);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        search = nextOpen + 1;
      } else {
        depth--;
        if (depth === 0) close = nextClose;
        search = nextClose + 1;
      }
    }
    if (close === -1) { pos = open + 1; continue; }
    const chunk = body.slice(open, close + '</product>'.length);
    pos = close + '</product>'.length;
    try {
      const parsed = parser.parse(chunk);
      const p = parsed.product || parsed;
      if (p && p['@_product_id']) results.push(flattenRakutenXMLProduct(p));
    } catch { /* skip malformed chunk */ }
  }
  return results;
}

function parseFeed(body, hint) {
  const trimmed = body.trim();
  if (!trimmed) return [];
  if (hint.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    return parsed.products || parsed.items || parsed.data || [];
  }
  if (trimmed.startsWith('<')) {
    const parser = makeXMLParser();
    const parsed = parser.parse(trimmed);
    const root = parsed.merchandiser || parsed.products || parsed.items || parsed.rss?.channel || parsed.feed || {};
    const raw = root.product || root.item || root.entry || [];
    const candidates = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
    return candidates.map(flattenRakutenXMLProduct);
  }
  return parseDelimited(trimmed);
}

function parseXML(body) {
  return parseFeed(body, 'xml');
}

function parseDelimited(body) {
  const lines = body.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = splitLine(lines[0], delimiter).map(normalizeKey);
  return lines.slice(1).map((line) => {
    const values = splitLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function splitLine(line, delimiter) {
  if (delimiter === '\t') return line.split('\t');
  return line.match(/("[^"]*"|[^,]+)/g)?.map((value) => value.replace(/^"|"$/g, '').trim()) || [];
}

function extractGarmentType(productName, category) {
  const gt = classifyGarment(category || '', productName || '');
  return gt && gt !== 'needs_review' ? gt : null;
}

function extractRowGateFields(row, feedUrl) {
  const rawName = cleanText(first(row, ['name', 'title', 'product_name', 'productname', 'description']));
  const rawCompositionRaw = cleanText(first(row, [
    'composition', 'material', 'fabric', 'materials',
    'material_description', 'fabric_description',
    'g_material', 'google_custom_label_1', 'custom_label_1',
  ]));
  const rawComposition = stripCompositionPrefix(rawCompositionRaw);
  const composition = isValidCompositionString(rawComposition) ? rawComposition : undefined;
  const categorySource = [
    cleanText(first(row, ['category', 'product_type', 'google_product_category', 'merchant_category', 'product_category', 'department'])),
    cleanText(first(row, ['secondary_category', 'product_type'])),
  ].filter(Boolean).join(' ');
  const category = normalizeCategory(categorySource, rawName);
  const name = refineProductTitle(rawName, category, composition);
  const price = cleanText(first(row, ['price', 'sale_price', 'current_price']));
  const imageUrl = first(row, ['image_url', 'image', 'image_link', 'thumbnail', 'picture', 'additional_image_link']);
  const url = first(row, ['link', 'url', 'product_url', 'click_url', 'buy_url']);
  const gender = cleanText(first(row, ['gender', 'sex', 'target_gender']));
  return { category, name, composition, imageUrl, price, url, gender };
}

async function applyColorUpdates(supabase, table, updates) {
  const byId = new Map();
  for (const update of updates) {
    if (!update?.product_id || !update?.color) continue;
    if (!byId.has(update.product_id)) byId.set(update.product_id, update.color);
  }
  if (!byId.size) return 0;

  let applied = 0;
  const ids = [...byId.keys()];
  const LOOKUP_CHUNK = 200;
  const UPDATE_CONCURRENCY = 25;

  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    const idChunk = ids.slice(i, i + LOOKUP_CHUNK);
    const { data: targets, error } = await withRetry(async () => {
      const result = await supabase
        .from(table)
        .select('product_id')
        .in('product_id', idChunk)
        .is('color', null);
      if (result.error) throw result.error;
      return result;
    });
    if (!targets?.length) continue;

    for (let j = 0; j < targets.length; j += UPDATE_CONCURRENCY) {
      const updateBatch = targets.slice(j, j + UPDATE_CONCURRENCY);
      const counts = await Promise.all(
        updateBatch.map(({ product_id }) =>
          withRetry(async () => {
            const color = byId.get(product_id);
            const { data, error } = await supabase
              .from(table)
              .update({ color, color_normalized: color })
              .eq('product_id', product_id)
              .is('color', null)
              .select('product_id');
            if (error) throw error;
            return data?.length || 0;
          })
        )
      );
      applied += counts.reduce((sum, n) => sum + n, 0);
    }
  }

  return applied;
}

function extractColorUpdateCandidate(row, feedUrl) {
  const productId = first(row, ['product_id', 'productid', 'sku', 'item_id', 'id', 'mid']);
  const url = first(row, ['link', 'url', 'product_url', 'click_url', 'buy_url']);
  if (!productId && !url) return null;

  const mytheresa = isMytheresaRow(row, feedUrl);
  const rawName = cleanText(first(row, ['name', 'title', 'product_name', 'productname', 'description']));
  const rawColor = cleanText(
    first(row, [
      'color', 'colour', 'Color', 'Colour',
      'item_color', 'designer_color', 'product_color',
      'attributeclass_color', 'custom_label_2', 'google_custom_label_2',
    ])
  );
  const colorValue = normalizeColorValue(rawColor) || extractColorFromName(rawName);
  if (!colorValue) return null;

  const mid = first(row, ['mid', 'merchant_id', 'advertiser_id', 'network_mid']);
  const { currency, region, retailerCountry } = resolveMidRegionCurrency(mid, row, { mytheresa });
  const baseId = String(productId || stableId(url));
  const regionedId = region === 'us' ? baseId : `${baseId}-${region}`;

  return { product_id: regionedId, color: colorValue };
}

function normalizeRakutenProduct(row, feedUrl) {
  const productId = first(row, ['product_id', 'productid', 'sku', 'item_id', 'id', 'mid']);
  const url = first(row, ['link', 'url', 'product_url', 'click_url', 'buy_url']);
  if (!productId && !url) return null;

  const mytheresa = isMytheresaRow(row, feedUrl);

  const rawBrand = mytheresa
    ? first(row, MYTHERESA_BRAND_FIELD_KEYS)
    : first(row, ['brand', 'brand_name', 'designer', 'designer_name', 'manufacturer', 'advertiser_name', 'merchant_name']);

  const isVeronicaBeardCanada = isVeronicaBeardCanadaRow(row);
  const brandName = isVeronicaBeardCanada
    ? 'Veronica Beard'
    : normalizeBrandName(cleanText(rawBrand));
  const rawName = cleanText(first(row, ['name', 'title', 'product_name', 'productname', 'description']));

  const rawCompositionRaw = cleanText(first(row, [
    'composition', 'material', 'fabric', 'materials',
    'material_description', 'fabric_description',
    'g_material', 'google_custom_label_1', 'custom_label_1'
  ]));
  // Strip 'Material: ' prefix (Mytheresa format) and truncate at care/origin suffixes
  const rawComposition = stripCompositionPrefix(rawCompositionRaw);
  // Only treat as a real fiber composition if it looks like material data, not a product description.
  let composition = isValidCompositionString(rawComposition) ? rawComposition : undefined;
  if (!composition) {
    composition = inferCompositionFromRow(row);
  }

  const categorySource = [
    cleanText(first(row, ['category', 'product_type', 'google_product_category', 'merchant_category', 'product_category', 'department'])),
    cleanText(first(row, ['secondary_category', 'product_type'])),
  ].filter(Boolean).join(' ');
  const category = normalizeCategory(categorySource, rawName);
  const name = refineProductTitle(rawName, category, composition);
  const price = cleanText(first(row, ['price', 'sale_price', 'current_price']));
  const originalPrice = cleanText(first(row, ['retail_price', 'original_price', 'was_price', 'list_price']));
  const imageUrl = first(row, ['image_url', 'image', 'image_link', 'thumbnail', 'picture', 'additional_image_link']);
  const gender = cleanText(first(row, ['gender', 'sex', 'target_gender']));

  const mid = first(row, ['mid', 'merchant_id', 'advertiser_id', 'network_mid']);

  // Align with Supabase catalog_consumer_exclusion_reason + catalog_is_womens_apparel_category.
  // Skip insert/upsert entirely — stale rows get is_active=false via markInactiveProducts (no last_seen_at bump).
  if (!passesConsumerIngestionGate({ category, name, composition, imageUrl, price, url, gender })) {
    return null;
  }

  const { isAvailable, stockStatus } = resolveAvailability(row);

  const genderScope = classifyGenderScope({ category, name, url, gender });
  const nfp = naturalFiberPercent(composition);
  const consumerApproved = approvalStatus(nfp, composition, category, name, genderScope);
  const consumerLive =
    consumerApproved === 'yes' &&
    nfp != null &&
    nfp >= 80 &&
    isAvailable &&
    Boolean(composition);

  const rawPrice = first(row, ['price', 'sale_price', 'current_price', 'retail_price', 'original_price']);
  const { currency, region, retailerCountry } = resolveMidRegionCurrency(mid, row, { mytheresa });
  const retailer = mytheresa ? 'Mytheresa' : normalizeBrandName(cleanText(first(row, ['advertiser_name', 'merchant_name', 'retailer'])));
  const retailerName = retailer || cleanText(first(row, ['merchant_name', 'advertiser_name', 'retailer_name']));
  const sku = first(row, ['sku', 'item_id', 'seller_id', 'merchant_product_id']);
  const upc = first(row, ['upc', 'ean', 'barcode', 'gtin']);
  const rawColor = cleanText(
    first(row, ['color', 'colour', 'Color', 'Colour', 'item_color', 'designer_color', 'product_color'])
  );
  const colorValue = normalizeColorValue(rawColor) || extractColorFromName(name);
  const sizeOptions = parseSizeOptions(row);
  const countryOfOrigin = cleanText(first(row, ['country_of_origin', 'made_in', 'origin_country']));
  const careInstructions = cleanText(first(row, ['care_instructions', 'care', 'care_label']));
  const season = cleanText(first(row, ['season', 'collection', 'season_collection']));
  const materialSummary = nfp != null ? `${nfp}% natural fiber` : (composition ? composition.slice(0, 80) : undefined);
  const now = new Date().toISOString();
  const numericPrice = numberFromPrice(price);
  const numericOriginal = numberFromPrice(originalPrice);
  const discountPercent = numericPrice && numericOriginal && numericOriginal > numericPrice
    ? Math.round(((numericOriginal - numericPrice) / numericOriginal) * 100)
    : undefined;

  // Region-scope the product_id so USD/EUR/GBP variants are separate rows
  const baseId = String(productId || stableId(url));
  const regionedId = region === 'us' ? baseId : `${baseId}-${region}`;

  const normalized = {
    product_id:            regionedId,
    brand_name:            brandName,
    brand_slug:            slugify(brandName),
    name,
    url,
    image_url:             imageUrl,
    price,
    original_price:        originalPrice,
    raw_price:             rawPrice,
    currency,
    retailer_country:      retailerCountry,
    region,
    retailer,
    retailer_name:         retailerName,
    is_sale:               isSale(price, originalPrice, row),
    discount_percent:      discountPercent,
    composition,
    natural_fiber_percent: nfp,
    material_summary:      materialSummary,
    color:                 colorValue,
    color_normalized:      colorValue,
    size_options:          sizeOptions,
    country_of_origin:     countryOfOrigin,
    care_instructions:     careInstructions,
    category,
    garment_type:          extractGarmentType(name, category),
    gender_scope:          genderScope,
    sku,
    upc,
    season,
    approved:              consumerApproved,
    is_active:             consumerLive,
    stock_status:          stockStatus,
    feed_source:           mytheresa ? 'mytheresa' : 'rakuten',
    retailer_mid:          mid || undefined,
    feed_url:              feedUrl,
    product_url_us:        region === 'us' ? url : undefined,
    product_url_uk:        region === 'uk' ? url : undefined,
    last_price_check:      now,
    price_changed_at:      discountPercent != null ? now : undefined,
    last_seen_at:          now,
    added_at:              now,
    updated_at:            now,
    tags:                  buildTags(row, composition, category),
    collection_slugs:      buildCollectionSlugs(composition, category),
    editorial_categories:  buildEditorialCategories(composition, category)
  };
  return Object.fromEntries(Object.entries(normalized).filter(([, v]) => v !== undefined && v !== null));
}

async function markInactiveProducts(supabase, config, cycleStartedAt) {
  const feedSources = config.markInactiveSources || ['rakuten', 'mytheresa'];
  let total = 0;

  for (const source of feedSources) {
    let sourceMarked = 0;
    while (true) {
      const { data: stale, error: selectError } = await withRetry(async () => {
        const result = await supabase
          .from(config.productsTable)
          .select('id')
          .eq('feed_source', source)
          .eq('is_active', true)
          .lt('last_seen_at', cycleStartedAt)
          .limit(INACTIVE_CHUNK_SIZE);
        if (result.error) throw result.error;
        return result;
      });
      if (!stale?.length) break;

      const ids = stale.map((p) => p.id);
      await withRetry(async () => {
        const { error } = await supabase
          .from(config.productsTable)
          .update({ is_active: false })
          .in('id', ids);
        if (error) throw error;
      });
      sourceMarked += ids.length;
      total += ids.length;
      if (stale.length < INACTIVE_CHUNK_SIZE) break;
    }
    console.log(`Marked ${sourceMarked} products inactive for ${source}`);
  }

  return total;
}

function first(row, keys) {
  for (const key of keys) {
    const direct = row[key];
    if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim();
    const foundKey = Object.keys(row).find((candidate) => normalizeKey(candidate) === key);
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') return String(row[foundKey]).trim();
  }
  return undefined;
}

/** Detect Canadian locale/shipping/currency signals in a Rakuten row (MID 43172 US+CA). */
function isCanadaOfferRow(row) {
  const locale = String(first(row, ['country', 'locale', 'ship_to_country', 'shipping_country']) || '').toUpperCase();
  const url = String(first(row, ['link', 'url', 'product_url', 'click_url']) || '').toLowerCase();
  const currencyRaw = String(first(row, ['currency', 'price_currency']) || '').toUpperCase();
  const priceStr = String(first(row, ['price', 'sale_price', 'current_price']) || '');
  if (locale === 'CA' || locale === 'CAN' || locale.includes('CANADA')) return true;
  if (/(\/ca\/|\.ca\/|country=ca|region=ca|locale=ca|\/en-ca\/)/.test(url)) return true;
  if (currencyRaw === 'CAD') return true;
  if (/C\$|\bCAD\b/i.test(priceStr)) return true;
  return false;
}

/** Resolve listing region + currency — MID 43172 splits US (USD) vs CA (CAD). */
function resolveMidRegionCurrency(mid, row, { mytheresa = false } = {}) {
  const midStr = String(mid || '');

  if (midStr === '43172') {
    if (isCanadaOfferRow(row)) {
      return { currency: 'CAD', region: 'ca', retailerCountry: 'CA' };
    }
    return { currency: 'USD', region: 'us', retailerCountry: 'US' };
  }

  const midOverride = MID_CURRENCY_MAP[midStr];
  if (midOverride) {
    const retailerCountry = midOverride.retailerCountry
      || first(row, ['country', 'locale'])
      || (mytheresa ? 'GB' : 'US');
    const currency = midOverride.currency
      || first(row, ['currency', 'price_currency'])
      || (retailerCountry === 'EU' ? 'EUR' : ['UK', 'GB'].includes(retailerCountry) ? 'GBP' : 'USD');
    return {
      currency,
      region: midOverride.region,
      retailerCountry,
    };
  }

  const retailerCountry = first(row, ['country', 'locale']) || (mytheresa ? 'GB' : 'US');
  const currency = first(row, ['currency', 'price_currency'])
    || (retailerCountry === 'EU' ? 'EUR' : ['UK', 'GB'].includes(retailerCountry) ? 'GBP' : 'USD');
  const region = currency === 'GBP' || ['UK', 'GB'].includes(retailerCountry) ? 'uk'
    : currency === 'EUR' || ['EU', 'DE', 'FR', 'IT', 'ES', 'NL'].includes(retailerCountry) ? 'eu'
      : isCanadaOfferRow(row) ? 'ca'
        : 'us';
  return { currency, region, retailerCountry };
}

function normalizeKey(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function cleanText(value) {
  if (!value) return undefined;
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBrandName(value) {
  if (!value) return undefined;
  const compact = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases = {
    alc: 'A.L.C.',
    oseree: 'Oséree',
    oseree: 'Oséree',
    therow: 'The Row',
    loropiana: 'Loro Piana',
    isabelmarant: 'Isabel Marant',
    fleurdumal: 'Fleur du Mal',
    smaxmara: 'Weekend Max Mara',
    weekendmaxmara: 'Weekend Max Mara',
    maxmara: 'Max Mara',
    missoni: 'Missoni',
    missonimare: 'Missoni',
    ragandbone: 'rag & bone',
    ragbone: 'rag & bone',
    lagence: "L'Agence",
    redone: 'RE/DONE',
    khaite: 'Khaite',
    toteme: 'Toteme',
    vince: 'Vince',
    theory: 'Theory',
    equipment: 'Equipment',
    zimmermann: 'Zimmermann',
    agolde: 'AGOLDE',
    citizensofhumanity: 'Citizens of Humanity',
    ullahjohnson: 'Ulla Johnson',
    ullajohnson: 'Ulla Johnson',
    faithfullthebrand: 'Faithfull the Brand',
    anothertomorrow: 'Another Tomorrow',
    anine: 'Anine Bing',
    aninebing: 'Anine Bing',
    staud: 'Staud',
    officinegeneral: 'Officine Générale',
    officinegenerale: 'Officine Générale',
    jacquemus: 'Jacquemus',
    sandro: 'Sandro',
    maje: 'Maje',
    ba7: 'ba&sh',
    bash: 'ba&sh',
    marysia: 'Marysia',
    nili: 'Nili Lotan',
    nililotan: 'Nili Lotan',
    diesel: 'Diesel',
  };
  return aliases[compact] || titleCase(value);
}

function normalizeCategory(value, title = '') {
  const text = [value, title].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('blazer')) return 'Blazer';
  if (text.includes('trouser') || text.includes('pants')) return 'Trousers';
  if (text.includes('skirt')) return 'Skirt';
  if (text.includes('dress')) return 'Dress';
  if (text.includes('shirt') || text.includes('blouse')) return 'Shirt';
  if (text.includes('coat')) return 'Coat';
  if (text.includes('jacket')) return 'Jacket';
  if (text.includes('knit') || text.includes('sweater') || text.includes('jumper')) return 'Knitwear';
  return value ? titleCase(value) : undefined;
}

function refineProductTitle(value, category, composition) {
  const cleaned = cleanText(value);
  const text = [cleaned, category, composition].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('boatneck') || text.includes('boat neck')) return text.includes('cashmere') ? 'Cashmere Boatneck Knit' : 'Boatneck Knit';
  if (text.includes('slip') && text.includes('dress')) return text.includes('silk') ? 'Silk Slip Dress' : 'Slip Dress';
  if (text.includes('midi') && text.includes('dress')) return text.includes('silk') ? 'Silk Satin Midi Dress' : 'Midi Dress';
  if (text.includes('coat') && text.includes('wool')) return 'Structured Wool Coat';
  if (text.includes('blazer') && text.includes('wool')) return 'Structured Wool Blazer';
  if (text.includes('shirt') && text.includes('cotton')) return 'Cotton Poplin Shirt';
  if (text.includes('trouser') && text.includes('linen')) return 'Tailored Linen Trouser';
  return cleaned ? titleCase(cleaned) : undefined;
}

function titleCase(value) {
  return String(value)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => ['and', 'of', 'in', 'with'].includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function slugify(value) {
  if (!value) return undefined;
  return String(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isSale(price, originalPrice, row) {
  const saleFlag = first(row, ['is_sale', 'sale', 'on_sale']);
  if (saleFlag) return ['true', 'yes', '1', 'sale'].includes(saleFlag.toLowerCase());
  const current = numberFromPrice(price);
  const original = numberFromPrice(originalPrice);
  return Boolean(current && original && current < original);
}

function numberFromPrice(value) {
  const match = String(value || '').match(/[0-9]+(?:\.[0-9]+)?/);
  return match ? Number(match[0]) : undefined;
}

const STANDARD_COLORS = new Set([
  'black', 'white', 'ivory', 'cream', 'ecru', 'off-white', 'neutrals', 'beige', 'grey', 'navy', 'blue',
  'red', 'burgundy', 'pink', 'green', 'brown', 'orange', 'yellow', 'gold', 'silver', 'rose gold',
  'metallic', 'purple', 'print', 'animal print', 'multi',
]);

const COLOR_VALUE_MAP = {
  black: 'black', noir: 'black', onyx: 'black', ebony: 'black', midnight: 'black',
  white: 'white', 'optical white': 'white', 'bright white': 'white', snow: 'white',
  ivory: 'ivory',
  cream: 'cream', oat: 'cream', butter: 'cream', vanilla: 'cream',
  ecru: 'ecru',
  'off white': 'off-white', 'off-white': 'off-white',
  nude: 'neutrals', neutral: 'neutrals', natural: 'neutrals', 'blush nude': 'neutrals',
  beige: 'beige', sand: 'beige', stone: 'beige', taupe: 'beige', camel: 'beige', khaki: 'beige',
  grey: 'grey', gray: 'grey', charcoal: 'grey', slate: 'grey', ash: 'grey', pewter: 'grey', smoke: 'grey',
  navy: 'navy', 'midnight blue': 'navy', 'dark navy': 'navy', ink: 'navy',
  blue: 'blue', cobalt: 'blue', cerulean: 'blue', cornflower: 'blue', teal: 'blue', denim: 'blue', indigo: 'blue', sky: 'blue', 'powder blue': 'blue',
  red: 'red', scarlet: 'red', cherry: 'red', crimson: 'red', tomato: 'red', rouge: 'red',
  burgundy: 'burgundy', bordeaux: 'burgundy', wine: 'burgundy', oxblood: 'burgundy', maroon: 'burgundy', merlot: 'burgundy',
  pink: 'pink', blush: 'pink', rose: 'pink', mauve: 'pink', fuchsia: 'pink', coral: 'pink', peach: 'pink', flamingo: 'pink', 'ballet pink': 'pink',
  green: 'green', olive: 'green', sage: 'green', forest: 'green', emerald: 'green', mint: 'green', moss: 'green', jade: 'green', hunter: 'green', 'khaki green': 'green',
  brown: 'brown', chocolate: 'brown', cognac: 'brown', tobacco: 'brown', toffee: 'brown', cinnamon: 'brown', chestnut: 'brown', walnut: 'brown', tan: 'brown',
  orange: 'orange', terracotta: 'orange', rust: 'orange', amber: 'orange', tangerine: 'orange', apricot: 'orange', 'burnt orange': 'orange',
  yellow: 'yellow', mustard: 'yellow', saffron: 'yellow', lemon: 'yellow', canary: 'yellow',
  gold: 'gold', golden: 'gold', champagne: 'gold', bronze: 'gold',
  silver: 'silver',
  'rose gold': 'rose gold',
  metallic: 'metallic', sequin: 'metallic', lurex: 'metallic', shimmer: 'metallic', glitter: 'metallic',
  purple: 'purple', violet: 'purple', lavender: 'purple', lilac: 'purple', plum: 'purple', aubergine: 'purple', grape: 'purple',
  print: 'print', floral: 'print', stripe: 'print', striped: 'print', check: 'print', plaid: 'print', paisley: 'print', printed: 'print', houndstooth: 'print', gingham: 'print',
  'animal print': 'animal print', leopard: 'animal print', cheetah: 'animal print', zebra: 'animal print', snakeskin: 'animal print', python: 'animal print',
  multi: 'multi', multicolor: 'multi', multicolour: 'multi', colorblock: 'multi', 'colour block': 'multi', rainbow: 'multi',
};

const COLOR_MAP_KEYS_LONGEST_FIRST = Object.keys(COLOR_VALUE_MAP).sort((a, b) => b.length - a.length);

function normalizeColorValue(raw) {
  if (!raw) return undefined;
  const v = String(raw).trim().toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!v) return undefined;

  if (COLOR_VALUE_MAP[v]) return COLOR_VALUE_MAP[v];

  for (const key of COLOR_MAP_KEYS_LONGEST_FIRST) {
    if (v.includes(key)) return COLOR_VALUE_MAP[key];
  }

  return STANDARD_COLORS.has(v) ? v : undefined;
}

function parseSizeOptions(row) {
  const raw = first(row, ['size_options', 'sizes', 'size', 'available_sizes']);
  if (!raw) return undefined;
  const parts = String(raw)
    .split(/[|,/;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? unique(parts).slice(0, 30) : undefined;
}

function inferCompositionFromRow(row) {
  const description = cleanText(first(row, [
    'description', 'short_desc', 'long_description', 'product_description',
    'material', 'fabric', 'material_description', 'fabric_description',
  ]));
  if (!description) return undefined;

  const labeled = description.match(
    /(?:material|fabric|composition|content|made of|crafted from)\s*[:\-]\s*([^.;\n]{5,160})/i
  );
  if (labeled?.[1]) {
    const candidate = stripCompositionPrefix(labeled[1].trim());
    if (isValidCompositionString(candidate)) return candidate;
  }

  const percentMatch = description.match(/(\d+\s*%\s*[a-z][^.;\n]{2,80})/i);
  if (percentMatch?.[1]) {
    const candidate = stripCompositionPrefix(percentMatch[1].trim());
    if (isValidCompositionString(candidate)) return candidate;
  }

  return undefined;
}

function resolveAvailability(row) {
  const availability = first(row, [
    'availability', 'in_stock', 'stock_status', 'shipping_availability',
    'quantity', 'stock_quantity', 'inventory', 'inventory_count',
  ]);
  const description = cleanText(first(row, ['description', 'short_desc', 'long_description'])) || '';
  const name = cleanText(first(row, ['name', 'title', 'product_name'])) || '';
  const combined = `${availability || ''} ${description} ${name}`.toLowerCase();

  if (/(out\s*of\s*stock|sold\s*out|unavailable|discontinued|not\s*available|no\s*longer\s*available)/.test(combined)) {
    return { isAvailable: false, stockStatus: 'sold_out' };
  }

  const stockStatus = inferStockStatus(availability);
  if (stockStatus === 'sold_out' || stockStatus === 'out_of_stock') {
    return { isAvailable: false, stockStatus };
  }
  if (stockStatus === 'in_stock' || stockStatus === 'low_stock') {
    return { isAvailable: true, stockStatus };
  }

  // No explicit signal — keep listing (affiliate feeds often omit availability).
  return { isAvailable: true, stockStatus: stockStatus || 'in_stock' };
}

async function deactivateUnavailableProducts(supabase, table) {
  let total = 0;
  const patterns = ['sold_out', 'out_of_stock', 'unavailable', 'discontinued'];

  for (const status of patterns) {
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .update({ is_active: false })
        .eq('stock_status', status)
        .eq('is_active', true)
        .select('id')
        .limit(INACTIVE_CHUNK_SIZE);
      if (error) throw error;
      const n = data?.length || 0;
      total += n;
      if (n < INACTIVE_CHUNK_SIZE) break;
    }
  }

  while (true) {
    const { data: missingComposition, error: compError } = await supabase
      .from(table)
      .update({ is_active: false, stock_status: 'unavailable' })
      .eq('is_active', true)
      .or('composition.is.null,composition.eq.')
      .select('id')
      .limit(INACTIVE_CHUNK_SIZE);
    if (compError) throw compError;
    const n = missingComposition?.length || 0;
    total += n;
    if (n < INACTIVE_CHUNK_SIZE) break;
  }

  return total;
}

/** Every active product in the live catalog must have an explicit stock_status. */
async function backfillStockStatus(supabase, table) {
  let updated = 0;
  let offset = 0;
  const CHUNK = 500;

  while (true) {
    const { data: liveRows, error: liveErr } = await supabase
      .from('live_products_apparel')
      .select('id')
      .range(offset, offset + CHUNK - 1);
    if (liveErr) throw liveErr;
    if (!liveRows?.length) break;

    const ids = liveRows.map((r) => r.id);
    const { data, error } = await supabase
      .from(table)
      .update({ stock_status: 'in_stock' })
      .in('id', ids)
      .eq('is_active', true)
      .is('stock_status', null)
      .select('id');
    if (error) throw error;
    updated += data?.length || 0;
    offset += CHUNK;
    if (liveRows.length < CHUNK) break;
  }

  return updated;
}

function inferStockStatus(availability) {
  const text = String(availability || '').toLowerCase().trim();
  if (!text) return null;
  if (/(out\s*of\s*stock|sold\s*out|unavailable|not\s*available|discontinued|no\s*longer\s*available)/.test(text)) {
    return 'sold_out';
  }
  if (/(low\s*stock|limited|few\s*left)/.test(text)) return 'low_stock';
  if (/(in\s*stock|available|yes|true|1|pre-?order)/.test(text)) return 'in_stock';
  return null;
}

// Mirrors public.catalog_is_womens_apparel_category (20240020)
const WOMENS_APPAREL_TOKENS = [
  'dress', 'gown', 'shirt', 'blouse', 'top', 'tank', 'turtleneck', 'bodysuit',
  'knitwear', 'knit', 'sweater', 'jumper', 'cardigan', 'pullover', 'vest',
  'trouser', 'pants', 'pant', 'skirt', 'shorts', 'jean', 'denim',
  'blazer', 'jacket', 'coat', 'outerwear', 'suit',
  'bottom', 'swimwear', 'lingerie', 'loungewear', 'sleepwear', 'robe', 'nightgown',
  'legging', 'jogger', 'overall', 'jumpsuit', 'romper',
  'parka', 'anorak', 'windbreaker', 'bomber', 'trench', 'poncho', 'cape',
  'kaftan', 'sarong', 'wrap', 'kimono', 'apparel', 'clothing',
  'women', 'woman', 'ladies', 'lady',
];

const CONSUMER_REJECTED_TOKENS = [
  'shoe', 'footwear', 'sandal', 'boot', 'sneaker', 'heel', 'pump', 'loafer', 'mule', 'flat',
  'bag', 'handbag', 'tote', 'clutch', 'purse', 'backpack', 'wallet',
  'jewelry', 'jewellery', 'earring', 'necklace', 'bracelet', 'brooch',
  'watch', 'watches',
  'accessory', 'accessories', 'belt', 'scarf', 'glove', 'sunglass', 'eyewear', 'glass',
  'cosmetic', 'beauty', 'fragrance', 'perfume', 'home', 'decor', 'furniture', 'candle',
  'lubricant', 'lube', 'supplement', 'vitamin', 'skincare', 'serum', 'moisturizer',
  'electronics', 'book', 'books', 'wellness', 'health', 'toy', 'toys', 'cleaner', 'care kit',
  'kid', 'kids', 'child', 'children', 'infant', 'baby',
];

const NON_APPAREL_CATEGORY_TERMS = [
  'beauty', 'health', 'wellness', 'skincare', 'fragrance',
  'home', 'decor', 'electronics', 'books', 'toys',
];

const NON_APPAREL_NAME_TERMS = [
  'lubricant', 'lube', 'supplement', 'vitamin', 'serum',
  'moisturizer', 'perfume', 'fragrance', 'candle', 'diffuser',
];

function includesToken(haystack, token) {
  const h = ` ${String(haystack || '').toLowerCase()} `;
  const n = String(token || '').toLowerCase();
  return h.includes(` ${n} `) || h.includes(`${n} `) || h.startsWith(`${n} `);
}

function isMensGenderLabel(gender = '') {
  const g = String(gender || '').toLowerCase();
  if (!g) return false;
  if (/\b(women|womens|woman|female|ladies|lady)\b/.test(g)) return false;
  return /\b(men|mens|male|man)\b/.test(g);
}

function isKidsGenderLabel(gender = '') {
  const g = String(gender || '').toLowerCase();
  return /\b(kid|kids|child|children|infant|baby|boy|girl)\b/.test(g);
}

function isWomensApparelCategory(category = '', name = '') {
  const cat = String(category || '').toLowerCase().trim();
  const nam = String(name || '').toLowerCase().trim();
  if (!cat && !nam) return false;

  for (const tok of CONSUMER_REJECTED_TOKENS) {
    if (includesToken(cat, tok) || includesToken(nam, tok)) return false;
  }

  if ((includesToken(cat, 'men') || includesToken(cat, 'mens') || includesToken(nam, ' for men') || includesToken(nam, ' mens '))
    && !includesToken(cat, 'women') && !includesToken(cat, 'woman')
    && !includesToken(nam, 'women') && !includesToken(nam, 'woman')) {
    return false;
  }

  return WOMENS_APPAREL_TOKENS.some((tok) => includesToken(cat, tok) || includesToken(nam, tok));
}

function consumerExclusionReason({ category = '', name = '', composition = '', imageUrl = '', price = '', url = '', gender = '' }) {
  if (!imageUrl || !String(imageUrl).trim()) return 'missing_image';
  const priceText = String(price || '').trim().toLowerCase();
  if (!priceText || ['n/a', 'na', '0', '0.00', '$0', '$0.00'].includes(priceText)) return 'missing_price';
  if (!url || !/^https?:\/\//i.test(String(url).trim())) return 'missing_url';
  if (!composition || !String(composition).trim()) return 'missing_composition';

  const cat = String(category || '').toLowerCase();
  const nam = String(name || '').toLowerCase();
  if (NON_APPAREL_NAME_TERMS.some((term) => nam.includes(term))) return 'non_apparel_product';
  if (NON_APPAREL_CATEGORY_TERMS.some((term) => cat.includes(term))) return 'non_apparel_product';

  if (/(shoe|footwear|sandal|boot|sneaker|heel|pump|loafer|mule)/.test(cat) || /(shoe|sandal|boot|sneaker|heel|pump|loafer|mule)/.test(nam)) return 'shoes';
  if (/(bag|handbag|tote|clutch|pouch|wallet|backpack)/.test(cat) || /(handbag|tote bag|clutch)/.test(nam)) return 'bags';
  if (/(jewelry|jewellery|earring|necklace|bracelet|brooch)/.test(cat) || /(earring|necklace|bracelet|brooch)/.test(nam)) return 'jewelry';
  if (cat.includes('watch') || nam.includes(' watch ') || nam.startsWith('watch ')) return 'watches';
  if (/(belt|scarf|hat|cap|glove|sunglass|eyewear|accessory|accessories)/.test(cat)) return 'accessories';
  if (isMensGenderLabel(gender)) return 'mens';
  if ((cat.includes('mens') || cat.startsWith('men') || nam.includes(' for men') || nam.includes(' mens '))
    && !cat.includes('women') && !cat.includes('woman')
    && !nam.includes('women') && !nam.includes('woman')) return 'mens';
  if (isKidsGenderLabel(gender) || /(kid|kids|child|children|girl|boy|baby|infant)/.test(cat)) return 'kids';
  if (/(beauty|fragrance|perfume|makeup|skincare|cosmetic|home|decor|furniture|candle)/.test(cat)) return 'beauty_home';
  if (!isWomensApparelCategory(category, name)) return 'not_womens_apparel';
  return null;
}

function passesConsumerIngestionGate(fields) {
  return consumerExclusionReason(fields) === null;
}

function passesRakutenXmlPrefilter(cl) {
  if (/(shoe|footwear|sandal|boot|sneaker|handbag|tote bag|clutch|wallet|backpack|jewelry|jewellery|earring|necklace|bracelet|watch|perfume|fragrance|cosmetic|furniture|home decor|lubricant|supplement|vitamin|skincare|serum|moisturizer|electronics|book|wellness|health|toy|cleaner)/.test(cl)) {
    return false;
  }
  if ((/\bfor men\b|> men\b| men's | menswear|male apparel/.test(cl) || /<gender>\s*men/i.test(cl))
    && !/women|woman|female|ladies/i.test(cl)) {
    return false;
  }
  if (/\b(kids?|children|infant|baby|boys?|girls?)\b/.test(cl) && !/women|woman/i.test(cl)) return false;
  return /(clothing|apparel|dress|shirt|blouse|trouser|skirt|coat|blazer|jacket|sweater|knit|jumper|swimwear|lingerie|loungewear|women|woman)/.test(cl);
}

function stripCompositionPrefix(value) {
  if (!value) return value;
  // Strip leading 'Material: ' or 'Fabric: ' labels (Mytheresa / Rakuten XML format)
  let v = value.replace(/^(material|fabric|composition|content):\s*/i, '');
  // Truncate at care instructions or origin suffix: '. Care instructions', '. Made in', '. Item color'
  v = v.replace(/[.;,]\s*(care instructions|made in|item color|designer color|dry clean|machine wash|hand wash).*/i, '').trim();
  return v;
}

// Phrases that indicate a product description / fit description, not a fiber composition
const DESCRIPTION_PREFIXES = /^(fits like|feels like|originally released|made from|crafted from|this|the|a |an |our |style|designed|featuring|product|description|details|care|color:|colour:)/i;
const ALL_FIBER_WORDS = ['linen', 'silk', 'cashmere', 'wool', 'cotton', 'alpaca', 'mohair', 'hemp', 'ramie', 'jute', 'lyocell', 'tencel', 'viscose', 'cupro', 'leather', 'suede', 'shearling', 'polyester', 'acrylic', 'nylon', 'polyamide', 'spandex', 'elastane', 'lycra'];

function isValidCompositionString(value) {
  if (!value) return false;
  // Must be under 200 chars
  if (value.length >= 200) return false;
  // Reject if it starts with a product-description phrase
  if (DESCRIPTION_PREFIXES.test(value.trim())) return false;
  const lower = value.toLowerCase();
  // Must contain at least one fiber word
  if (!ALL_FIBER_WORDS.some((f) => lower.includes(f))) return false;
  // Must contain '%' OR be very short (<80 chars, e.g. "100% Cotton", "Silk", "Leather & Suede")
  return value.includes('%') || value.length < 80;
}

const NATURAL_FIBER_WORDS = ['linen', 'silk', 'cashmere', 'wool', 'cotton', 'alpaca', 'mohair', 'hemp', 'ramie', 'jute', 'lyocell', 'tencel', 'viscose', 'cupro', 'leather', 'suede', 'shearling'];
const SYNTHETIC_FIBER_WORDS = ['polyester', 'acrylic', 'nylon', 'polyamide', 'spandex', 'elastane', 'lycra', 'polypropylene', 'polylurethane', 'synthetic', 'man-made'];

function classifyGenderScope({ category = '', name = '', url = '', gender = '' }) {
  if (isKidsGenderLabel(gender)) return 'kids';
  const cat = String(category || '').toLowerCase();
  const nam = String(name || '').toLowerCase();
  const u = String(url || '').toLowerCase();
  if (isMensGenderLabel(gender)) return 'men';
  if ((cat.includes('mens') || cat.startsWith('men ') || nam.includes(' for men') || nam.includes(' mens '))
    && !cat.includes('women') && !nam.includes('women')) return 'men';
  if (u.includes('/men/') || u.includes('/mens/') || u.includes('/menswear/')) {
    if (!u.includes('women') && !u.includes('womens')) return 'men';
  }
  if (/\b(women|womens|woman|female|ladies)\b/i.test(`${gender} ${cat} ${nam}`)) return 'women';
  if (/\bunisex\b/i.test(gender)) return 'unisex';
  if (isWomensApparelCategory(category, name)) return 'women';
  return 'unknown';
}

function approvalStatus(nfp, composition = '', category = '', name = '', genderScope = 'unknown') {
  if (genderScope === 'men' || genderScope === 'kids') return 'pending';
  if (genderScope === 'unknown') return 'pending';
  if (!isWomensApparelCategory(category, name) && genderScope !== 'women' && genderScope !== 'unisex') {
    return 'pending';
  }
  // If we parsed a numeric fiber percent, use that as the definitive test
  if (nfp !== undefined && nfp !== null) {
    if (nfp >= 80) return 'yes';
    return 'pending';
  }
  // No percent data — only approve if composition lists ONLY natural fibers, no synthetics
  if (!composition) return 'pending';
  const text = composition.toLowerCase();
  const hasSynthetic = SYNTHETIC_FIBER_WORDS.some((f) => text.includes(f));
  if (hasSynthetic) return 'pending';
  const hasNatural = NATURAL_FIBER_WORDS.some((f) => text.includes(f));
  if (hasNatural) return 'yes';
  return 'pending';
}

const SECONDARY_COMPOSITION_RE = /(?:^|[.;]\s*|\n)\s*(rib(?:bed)?\s*parts?|rib(?:bed)?|trim|embroidery|lining|contrast|pocket(?:ing)?|button|decoration|appliqu[eé]|exclusive of|excluding)\s*:/i;

function splitCompositionSegments(composition = '') {
  let text = String(composition).replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/\.\s+(?=(rib(?:bed)?\s*parts?|rib(?:bed)?|trim|embroidery|lining|contrast|pocket(?:ing)?|button|decoration|appliqu[eé]|exclusive of|excluding)\s*:)/gi, '\n');
  return text.split(/\n|;|\|/).map((s) => s.trim()).filter(Boolean);
}

function isSecondaryCompositionSegment(segment = '') {
  return SECONDARY_COMPOSITION_RE.test(segment) || /^(trim|embroidery|lining|contrast|pocket|rib(?:bed)?(?:\s*parts?)?|button|decoration|appliqu[eé])\s*:/i.test(segment);
}

function naturalFiberPercent(composition = '') {
  const segments = splitCompositionSegments(composition);
  const bodySegment = segments.find((s) => !isSecondaryCompositionSegment(s)) || segments[0] || '';
  const matches = [...bodySegment.toLowerCase().matchAll(/(\d+(?:\.\d+)?)\s*%\s*([a-z ]+)/g)];
  if (matches.length === 0) return undefined;
  const sum = matches.reduce((total, match) => {
    const fiber = match[2].trim();
    return total + (NATURAL_FIBERS.some((natural) => fiber.includes(natural)) ? Number(match[1]) : 0);
  }, 0);
  return Math.min(100, Math.round(sum));
}

function buildTags(row, composition, category) {
  const text = [composition, category, first(row, ['keywords', 'tags', 'description'])].filter(Boolean).join(' ').toLowerCase();
  return unique(['dress', 'shirt', 'skirt', 'blazer', 'trousers', 'linen', 'silk', 'cotton', 'wool', 'cashmere', 'sale'].filter((term) => text.includes(term)));
}

const CANONICAL_TO_EDITORIAL = {
  'vacation-shop': 'vacation',
  'vacation-edit': 'vacation',
  'occasion-edit': 'evening',
  'silk-occasion': 'evening',
  'evening-edit': 'evening',
  'tailoring-edit': 'tailoring',
  'city-wardrobe': 'summer-in-the-city',
  'the-white-edit': 'white-edit',
};

function addEditorialSlugs(slugs) {
  const result = new Set(slugs);
  for (const slug of slugs) {
    const editorial = CANONICAL_TO_EDITORIAL[slug];
    if (editorial) result.add(editorial);
  }
  return Array.from(result);
}

function buildCollectionSlugs(composition, category) {
  const text = [composition, category].filter(Boolean).join(' ').toLowerCase();
  const canonical = unique([
    text.includes('linen') ? 'linen-essentials' : null,
    text.includes('silk') ? 'the-silk-edit' : null,
    text.includes('cashmere') ? 'the-cashmere-edit' : null,
    text.includes('wool') || text.includes('blazer') ? 'tailoring-edit' : null,
    text.includes('dress') ? 'occasion-edit' : null,
    /resort|vacation|beach|swim|kaftan|caftan/i.test(text) ? 'vacation-shop' : null,
    /city|urban|commute/i.test(text) ? 'city-wardrobe' : null,
    /white|ivory|ecru|cream/i.test(text) ? 'the-white-edit' : null,
  ].filter(Boolean));
  return addEditorialSlugs(canonical);
}

function buildEditorialCategories(composition, category) {
  const text = [composition, category].filter(Boolean).join(' ').toLowerCase();
  return unique([
    text.includes('linen') ? 'Linen Essentials' : null,
    text.includes('silk') ? 'The Silk Edit' : null,
    text.includes('cashmere') ? 'The Cashmere Edit' : null,
    text.includes('wool') ? 'Wool Tailoring' : null
  ].filter(Boolean));
}

function stableId(value) {
  let hash = 0;
  const input = String(value || 'rakuten-product');
  for (let i = 0; i < input.length; i += 1) hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  return `rakuten-${Math.abs(hash)}`;
}

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export {
  syncRakutenFeeds,
  isWomensApparelCategory,
  consumerExclusionReason,
  passesConsumerIngestionGate,
  naturalFiberPercent,
  approvalStatus,
  classifyGenderScope,
};
