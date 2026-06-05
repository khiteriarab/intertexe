import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import { execSync } from 'child_process';
import { classifyGarment } from '../catalog-rules.js';

const NATURAL_FIBERS = ['cotton', 'linen', 'silk', 'wool', 'cashmere', 'alpaca', 'mohair', 'hemp', 'ramie', 'leather', 'suede'];
const DEFAULT_BATCH_SIZE = 500;

const MYTHERESA_MIDS = new Set([
  '35663',  // mytheresa.com EU/UK/ME
  '43172',  // mytheresa.com US/CA
  'mytheresa',
  'mytheresa.com',
]);

const VERONICA_BEARD_CA_MIDS = new Set([
  '52963',
]);

// MID → forced currency/region (overrides feed-level XML values)
const MID_CURRENCY_MAP = {
  '35663': { currency: 'EUR', region: 'eu', retailerCountry: 'DE' },
  '43172': { currency: 'USD', region: 'us', retailerCountry: 'US' },
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

function isMytheresaRow(row, feedUrl = '') {
  const mid = first(row, ['mid', 'merchant_id', 'advertiser_id', 'network_mid']);
  const isVeronicaBeardCanada = VERONICA_BEARD_CA_MIDS.has(String(mid || '').trim());
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
  const errors = [];

  async function processRows(rows, sourceUrl) {
    fetched += rows.length;
    const products = [];
    for (const row of rows) {
      const product = normalizeRakutenProduct(row, sourceUrl);
      if (product) products.push(product);
      else skippedOutOfScope += 1;
    }
    normalized += products.length;

    // Fields managed by humans/editorial — never overwrite on re-sync
    const CURATED_FIELDS = new Set(['approved', 'tags', 'collection_slugs', 'editorial_categories', 'matching_set_id', 'added_at']);

    for (const batch of chunk(products, config.batchSize)) {
      const productIds = batch.map((p) => p.product_id);

      // Find which products already exist (to preserve their curated fields)
      const { data: existing } = await supabase
        .from(config.productsTable)
        .select('product_id')
        .in('product_id', productIds);

      const existingIds = new Set((existing || []).map((r) => r.product_id));

      // New products: insert with all fields including computed approved/tags
      const newProducts = batch.filter((p) => !existingIds.has(p.product_id));
      if (newProducts.length > 0) {
        await withRetry(async () => {
          const { error } = await supabase.from(config.productsTable).insert(newProducts);
          if (error) throw error;
        });
        upserted += newProducts.length;
      }

      // Existing products: upsert only feed-driven fields (strip curated)
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
      }
    }
  }

  if (config.hasFtp) {
    try {
      await fetchRakutenFTP(config, async ({ rows, filename }) => {
        try {
          await processRows(rows, `ftp://${config.ftpHost}/${filename}`);
        } catch (err) {
          errors.push({ feedUrl: filename, message: err.message });
        }
      });
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

  const inactiveMarked = await markInactiveProducts(supabase, config, syncStartedAt);

  try {
    await supabase.from('system_status').upsert({
      key: 'rakuten_feed_sync',
      value_json: {
        syncStartedAt,
        fetched,
        normalized,
        skippedOutOfScope,
        upserted,
        inactiveMarked,
        errorCount: errors.length,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (statusErr) {
    errors.push({ feedUrl: 'system_status', message: statusErr.message });
  }

  try {
    console.log('Running designer sync...');
    execSync('node scripts/sync-designers-from-products.mjs', { stdio: 'inherit' });
    console.log('Designer sync complete.');
  } catch (designerSyncErr) {
    const message = designerSyncErr instanceof Error ? designerSyncErr.message : String(designerSyncErr);
    errors.push({ feedUrl: 'designer_sync', message });
  }

  return {
    ok: errors.length === 0,
    syncStartedAt,
    fetched,
    normalized,
    skippedOutOfScope,
    upserted,
    inactiveMarked,
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
    ftpDirFilter: options.ftpDirFilter || null, // optional array of dir names to restrict sync
    timeoutMs: Number(options.timeoutMs || process.env.FEED_SYNC_TIMEOUT_MS || 120000),
    authHeader: options.authHeader || process.env.RAKUTEN_AUTH_HEADER,
    bearerToken: options.bearerToken || process.env.RAKUTEN_ACCESS_TOKEN,
    username: options.username || process.env.RAKUTEN_USERNAME,
    password: options.password || process.env.RAKUTEN_PASSWORD
  };
}

async function fetchRakutenFTP(config, onFile) {
  let Client;
  try {
    ({ Client } = await import('basic-ftp'));
  } catch {
    throw new Error('basic-ftp is not installed. Run: npm install basic-ftp');
  }
  const { PassThrough } = await import('stream');
  const { gunzipSync } = await import('zlib');
  const { createGunzip } = await import('zlib');
  const { Readable } = await import('stream');

  const ftpAccess = {
    host: config.ftpHost,
    port: 21,
    user: config.ftpUsername,
    password: config.ftpPassword,
    secure: false,
  };

  // Helper: create a fresh connected FTP client
  async function connect() {
    const c = new Client(90000);
    c.ftp.verbose = false;
    await c.access(ftpAccess);
    return c;
  }

  // Step 1: list all files using one connection
  let catalogFiles = [];
  {
    const c = await connect();
    try {
      await c.cd('.');
      const topList = await c.list('.');
      const allFiles = [];
      for (const entry of topList) {
        if (entry.type === 2) {
          // Directory — recurse one level (merchant subdirs like 50745/)
          try {
            const subList = await c.list(entry.name);
            for (const f of subList) allFiles.push({ ...f, dir: entry.name });
          } catch { /* skip unreadable dirs */ }
        } else {
          allFiles.push(entry);
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

  const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB compressed
  console.log(`FTP: found ${catalogFiles.length} catalog files`);

  // Step 2: download and process each file with its own fresh FTP connection
  for (const file of catalogFiles) {
    if (file.size > MAX_FILE_BYTES) {
      console.warn(`FTP: skipping ${file.name} (${Math.round(file.size / 1024 / 1024)}MB > 200MB limit)`);
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
      console.warn(`FTP file error ${file.name}: ${err.message}`);
      if (client) { try { client.close(); } catch {} }
    }
  }
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

function normalizeRakutenProduct(row, feedUrl) {
  const productId = first(row, ['product_id', 'productid', 'sku', 'item_id', 'id', 'mid']);
  const url = first(row, ['link', 'url', 'product_url', 'click_url', 'buy_url']);
  if (!productId && !url) return null;

  const mytheresa = isMytheresaRow(row, feedUrl);

  const rawBrand = mytheresa
    ? first(row, MYTHERESA_BRAND_FIELD_KEYS)
    : first(row, ['brand', 'brand_name', 'designer', 'designer_name', 'manufacturer', 'advertiser_name', 'merchant_name']);

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
  const composition = isValidCompositionString(rawComposition) ? rawComposition : undefined;

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

  const availability = first(row, ['availability', 'in_stock', 'stock_status']);
  const isAvailable = !availability || /in.?stock|available|yes|true|1/i.test(availability);
  const stockStatus = inferStockStatus(availability);

  const genderScope = classifyGenderScope({ category, name, url, gender });
  const nfp = naturalFiberPercent(composition);
  const consumerApproved = approvalStatus(nfp, composition, category, name, genderScope);
  const consumerLive =
    consumerApproved === 'yes' &&
    nfp != null &&
    nfp >= 80 &&
    isAvailable;

  const rawPrice = first(row, ['price', 'sale_price', 'current_price', 'retail_price', 'original_price']);
  // MID-based overrides take highest priority (known merchant→currency/region mappings)
  const midOverride = MID_CURRENCY_MAP[String(mid || '')];
  const retailerCountry = midOverride?.retailerCountry
    || first(row, ['country', 'locale'])
    || (mytheresa ? 'GB' : 'US');
  const currency = midOverride?.currency
    || first(row, ['currency', 'price_currency'])
    || (retailerCountry === 'EU' ? 'EUR' : ['UK','GB'].includes(retailerCountry) ? 'GBP' : 'USD');
  const region = midOverride?.region
    || (currency === 'GBP' || ['UK','GB'].includes(retailerCountry) ? 'uk'
    : currency === 'EUR' || ['EU','DE','FR','IT','ES','NL'].includes(retailerCountry) ? 'eu'
    : 'us');
  const retailer = mytheresa ? 'Mytheresa' : normalizeBrandName(cleanText(first(row, ['advertiser_name', 'merchant_name', 'retailer'])));
  const retailerName = retailer || cleanText(first(row, ['merchant_name', 'advertiser_name', 'retailer_name']));
  const sku = first(row, ['sku', 'item_id', 'seller_id', 'merchant_product_id']);
  const upc = first(row, ['upc', 'ean', 'barcode', 'gtin']);
  const feedColor = cleanText(first(row, ['color', 'colour', 'designer_color', 'item_color', 'product_color']));
  const colorValue = normalizeColorValue(feedColor);
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

async function markInactiveProducts(supabase, config, syncStartedAt) {
  const feedSources = config.markInactiveSources || ['rakuten', 'mytheresa'];
  let total = 0;
  for (const source of feedSources) {
    const { data, error } = await supabase
      .from(config.productsTable)
      .update({ is_active: false })
      .eq('feed_source', source)
      .lt('last_seen_at', syncStartedAt)
      .select('product_id');
    if (error) throw error;
    total += data?.length || 0;
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
  'black', 'white', 'ivory', 'cream', 'ecru', 'off-white', 'neutrals', 'grey', 'brown', 'beige',
  'navy', 'blue', 'red', 'burgundy', 'pink', 'green', 'orange', 'yellow', 'gold', 'silver',
  'metallic', 'rose gold', 'purple', 'multi', 'animal print', 'print',
]);

function normalizeColorValue(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return undefined;
  const compact = raw.replace(/[^a-z0-9- ]/g, ' ').replace(/\s+/g, ' ').trim();
  const colorMap = {
    noir: 'black', midnight: 'black', onyx: 'black', ebony: 'black',
    'optical white': 'white', snow: 'white', 'bright white': 'white',
    ivory: 'ivory',
    oat: 'cream', butter: 'cream', vanilla: 'cream',
    ecru: 'ecru',
    'off white': 'off-white', 'off-white': 'off-white', offwhite: 'off-white',
    neutral: 'neutrals', nude: 'neutrals', natural: 'neutrals',
    gray: 'grey', charcoal: 'grey', slate: 'grey', ash: 'grey', pewter: 'grey', 'silver grey': 'grey', smoke: 'grey',
    chocolate: 'brown', cognac: 'brown', tobacco: 'brown', toffee: 'brown', cinnamon: 'brown', chestnut: 'brown', walnut: 'brown', hazel: 'brown', mocha: 'brown',
    sand: 'beige', stone: 'beige', taupe: 'beige', camel: 'beige', tan: 'beige', khaki: 'beige',
    burgundy: 'burgundy', bordeaux: 'burgundy', wine: 'burgundy', oxblood: 'burgundy', merlot: 'burgundy', maroon: 'burgundy',
    scarlet: 'red', cherry: 'red', crimson: 'red', tomato: 'red', poppy: 'red', rouge: 'red',
    navy: 'navy', 'midnight blue': 'navy', 'dark navy': 'navy', ink: 'navy',
    cobalt: 'blue', cerulean: 'blue', cornflower: 'blue', 'sky blue': 'blue', 'powder blue': 'blue', 'baby blue': 'blue', 'royal blue': 'blue', 'electric blue': 'blue', teal: 'blue', denim: 'blue', indigo: 'blue',
    blush: 'pink', rose: 'pink', mauve: 'pink', fuchsia: 'pink', coral: 'pink', peach: 'pink', 'dusty pink': 'pink', 'hot pink': 'pink', bubblegum: 'pink', flamingo: 'pink', ballet: 'pink',
    olive: 'green', sage: 'green', forest: 'green', emerald: 'green', mint: 'green', moss: 'green', jade: 'green', hunter: 'green', pistachio: 'green', lime: 'green', army: 'green', 'bottle green': 'green',
    amber: 'orange', tangerine: 'orange', apricot: 'orange', 'burnt orange': 'orange', papaya: 'orange', terracotta: 'orange', rust: 'orange', clay: 'orange',
    mustard: 'yellow', saffron: 'yellow', sunshine: 'yellow', lemon: 'yellow', canary: 'yellow',
    gold: 'gold', golden: 'gold', champagne: 'gold', bronze: 'gold',
    silver: 'silver',
    'rose gold': 'rose gold',
    metallic: 'metallic', sequin: 'metallic', lurex: 'metallic', glitter: 'metallic', shimmer: 'metallic', foil: 'metallic',
    lavender: 'purple', lilac: 'purple', plum: 'purple', violet: 'purple', aubergine: 'purple', grape: 'purple', orchid: 'purple', wisteria: 'purple',
    multicolor: 'multi', multicolour: 'multi', 'multi color': 'multi', 'multi colour': 'multi', rainbow: 'multi', colorblock: 'multi', 'colour block': 'multi',
    leopard: 'animal print', cheetah: 'animal print', zebra: 'animal print', snake: 'animal print', snakeskin: 'animal print', python: 'animal print', tiger: 'animal print', 'cow print': 'animal print',
    floral: 'print', stripe: 'print', striped: 'print', check: 'print', plaid: 'print', tartan: 'print', paisley: 'print', 'polka dot': 'print', abstract: 'print', printed: 'print', pattern: 'print', houndstooth: 'print', gingham: 'print', 'tie dye': 'print', camouflage: 'print',
  };
  const mapped = colorMap[compact] || compact;
  return STANDARD_COLORS.has(mapped) ? mapped : mapped;
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

function inferStockStatus(availability) {
  const text = String(availability || '').toLowerCase();
  if (!text) return 'in_stock';
  if (/(out of stock|sold out|unavailable|not available|0)/.test(text)) return 'out_of_stock';
  if (/(low stock|limited|few left)/.test(text)) return 'low_stock';
  if (/(in stock|available|yes|true|1)/.test(text)) return 'in_stock';
  return 'in_stock';
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
  return haystack.includes(token);
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
  if (!cat) return false;

  for (const tok of CONSUMER_REJECTED_TOKENS) {
    if (includesToken(cat, tok) || includesToken(nam, tok)) return false;
  }

  if ((includesToken(cat, 'men') || includesToken(cat, 'mens') || includesToken(nam, ' for men') || includesToken(nam, ' mens '))
    && !includesToken(cat, 'women') && !includesToken(cat, 'woman')
    && !includesToken(nam, 'women') && !includesToken(nam, 'woman')) {
    return false;
  }

  return WOMENS_APPAREL_TOKENS.some((tok) => includesToken(cat, tok));
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
  if (!isWomensApparelCategory(category, name)) return 'pending';
  // If we parsed a numeric fiber percent, use that as the definitive test
  if (nfp !== undefined && nfp !== null) {
    if (nfp >= 90) return 'yes';
    if (nfp >= 85) return 'review';
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
};
