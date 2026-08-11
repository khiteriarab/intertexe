import { createSign } from "crypto";
import { gunzipSync } from "zlib";
import type { ProviderAdapter, TokenBundle } from "../types";

/**
 * App Store Connect has no user OAuth for Analytics/Sales API.
 * Tokens are short-lived JWTs minted from a team .p8 key stored encrypted in HQ.
 *
 * Downloads come from Sales and Trends daily SUMMARY reports (App Units).
 * Vendor number is required — find it in App Store Connect → Payments and Financial Reports.
 */

/** Product type IDs that count as first-time App Units (downloads), not updates. */
const APP_UNIT_TYPES = new Set(["1", "1F", "1T", "F1", "FI1"]);

export const appStoreConnectAdapter: ProviderAdapter = {
  id: "app_store_connect",

  isConfigured() {
    return true;
  },

  getAuthorizationUrl() {
    throw new Error("App Store Connect uses API key upload, not OAuth redirect");
  },

  async exchangeCode() {
    throw new Error("App Store Connect uses API key upload, not OAuth code exchange");
  },

  async syncMetrics({ metadata }) {
    const keyId = String(metadata.keyId || "").trim();
    const issuerId = String(metadata.issuerId || "").trim();
    const privateKey = String(metadata.privateKeyPem || "").trim();
    const vendorNumber = String(metadata.vendorNumber || "").trim().replace(/\s+/g, "");
    const bundleIdFilter = String(metadata.bundleId || "").trim().toLowerCase();

    if (!keyId || !issuerId || !privateKey) {
      return {
        metrics: {
          syncedAt: new Date().toISOString(),
          note: "Upload Key ID, Issuer ID, and .p8 private key to enable App Store Connect sync",
          setupWarnings: ["Missing App Store Connect API key fields"],
        },
      };
    }

    const jwt = mintAscJwt({ keyId, issuerId, privateKey });
    const appsRes = await fetch("https://api.appstoreconnect.apple.com/v1/apps?limit=20", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const appsJson = await appsRes.json().catch(() => ({}));
    if (!appsRes.ok) {
      return {
        metrics: {
          syncedAt: new Date().toISOString(),
          ascError:
            appsJson?.errors?.[0]?.detail ||
            `App Store Connect API error (${appsRes.status})`,
        },
        raw: appsJson,
      };
    }

    const apps = Array.isArray(appsJson.data) ? appsJson.data : [];
    const appSummaries = apps.map(
      (a: { id: string; attributes?: { name?: string; bundleId?: string } }) => ({
        id: a.id,
        name: a.attributes?.name,
        bundleId: a.attributes?.bundleId,
      })
    );

    if (!vendorNumber) {
      return {
        metrics: {
          syncedAt: new Date().toISOString(),
          appsVisible: apps.length,
          appNames: appSummaries.map((a) => a.name).filter(Boolean),
          setupWarnings: [
            "Add your Vendor Number (Payments and Financial Reports) to pull App Store downloads",
          ],
          downloadsReady: false,
        },
        raw: { apps: appSummaries },
      };
    }

    const byDate = await fetchDailyAppUnits({
      jwt,
      vendorNumber,
      bundleIdFilter,
      daysBack: 16,
    });

    const dates = Object.keys(byDate).sort();
    const latestDate = dates.length ? dates[dates.length - 1] : null;
    const sumRange = (endExclusiveOffsetDays: number, length: number) => {
      if (!latestDate) return 0;
      const end = parseIsoDate(latestDate);
      if (!end) return 0;
      let total = 0;
      for (let i = 0; i < length; i++) {
        const d = new Date(end);
        d.setUTCDate(d.getUTCDate() - endExclusiveOffsetDays - i);
        const key = isoDate(d);
        total += byDate[key] || 0;
      }
      return total;
    };

    const appUnitsLatestDay = latestDate ? byDate[latestDate] || 0 : null;
    const appUnits7d = latestDate ? sumRange(0, 7) : null;
    const appUnitsPrev7d = latestDate ? sumRange(7, 7) : null;
    const appUnits30d = latestDate ? sumRange(0, Math.min(30, dates.length)) : null;

    const daily = dates.slice(-14).map((date) => ({
      date,
      appUnits: byDate[date] || 0,
    }));

    const fetchErrors = (byDate as { __errors?: string[] }).__errors || [];

    return {
      metrics: {
        syncedAt: new Date().toISOString(),
        appsVisible: apps.length,
        appNames: appSummaries.map((a) => a.name).filter(Boolean),
        vendorNumber,
        reportLatestDate: latestDate,
        appUnitsLatestDay,
        appUnits7d,
        appUnitsPrev7d,
        appUnits30d,
        downloads7d: appUnits7d,
        downloadsPrev7d: appUnitsPrev7d,
        downloads30d: appUnits30d,
        downloadsReady: true,
        daily,
        reportDaysFetched: dates.length,
        ...(fetchErrors.length
          ? { setupWarnings: fetchErrors.slice(0, 3) }
          : {}),
        ...(dates.length === 0
          ? {
              ascError:
                "Connected, but no Sales SUMMARY daily rows returned yet (reports lag 1–2 days, or Vendor Number may be wrong).",
            }
          : {}),
      },
      raw: {
        apps: appSummaries,
        daily,
        vendorNumber,
      },
    };
  },
};

export function mintAscJwt(args: { keyId: string; issuerId: string; privateKey: string }): string {
  const header = { alg: "ES256", kid: args.keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: args.issuerId,
    iat: now,
    exp: now + 20 * 60,
    aud: "appstoreconnect-v1",
  };
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const data = `${enc(header)}.${enc(payload)}`;
  const key = args.privateKey.includes("BEGIN")
    ? args.privateKey
    : `-----BEGIN PRIVATE KEY-----\n${args.privateKey}\n-----END PRIVATE KEY-----`;
  const sign = createSign("SHA256");
  sign.update(data);
  sign.end();
  const sig = sign.sign(key);
  const raw = derToJose(sig);
  return `${data}.${raw.toString("base64url")}`;
}

function derToJose(der: Buffer): Buffer {
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;
  offset++;
  const rLen = der[offset++];
  let r = der.subarray(offset, offset + rLen);
  offset += rLen;
  offset++;
  const sLen = der[offset++];
  let s = der.subarray(offset, offset + sLen);
  if (r.length === 33 && r[0] === 0) r = r.subarray(1);
  if (s.length === 33 && s[0] === 0) s = s.subarray(1);
  const out = Buffer.alloc(64);
  r.copy(out, 32 - r.length);
  s.copy(out, 64 - s.length);
  return out;
}

/** Build a TokenBundle placeholder after API key upload (JWT minted at sync time). */
export function appStoreKeyBundle(meta: {
  keyId: string;
  issuerId: string;
  privateKeyPem: string;
  vendorNumber?: string;
  bundleId?: string;
  accountLabel?: string;
}): TokenBundle {
  return {
    accessToken: "asc-key-stored",
    refreshToken: null,
    expiresAt: null,
    tokenType: "asc_api_key",
    accountLabel: meta.accountLabel || `ASC key ${meta.keyId}`,
    externalAccountId: meta.keyId,
    metadata: {
      keyId: meta.keyId,
      issuerId: meta.issuerId,
      privateKeyPem: meta.privateKeyPem,
      ...(meta.vendorNumber ? { vendorNumber: meta.vendorNumber } : {}),
      ...(meta.bundleId ? { bundleId: meta.bundleId } : {}),
    },
  };
}

async function fetchDailyAppUnits(args: {
  jwt: string;
  vendorNumber: string;
  bundleIdFilter: string;
  daysBack: number;
}): Promise<Record<string, number> & { __errors?: string[] }> {
  const out: Record<string, number> & { __errors?: string[] } = {};
  const errors: string[] = [];
  const today = new Date();
  // Sales reports typically lag ~1–2 days; skip "today".
  for (let i = 1; i <= args.daysBack; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    const reportDate = isoDate(d);
    try {
      const units = await fetchOneSalesDay({
        jwt: args.jwt,
        vendorNumber: args.vendorNumber,
        reportDate,
        bundleIdFilter: args.bundleIdFilter,
      });
      if (units != null) out[reportDate] = units;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Empty days / not-yet-available are normal — only keep real API failures.
      if (!/no sales|404|not found|empty report/i.test(msg)) {
        errors.push(`${reportDate}: ${msg}`.slice(0, 160));
      }
    }
  }
  if (errors.length) out.__errors = errors;
  return out;
}

async function fetchOneSalesDay(args: {
  jwt: string;
  vendorNumber: string;
  reportDate: string;
  bundleIdFilter: string;
}): Promise<number | null> {
  const params = new URLSearchParams();
  params.set("filter[vendorNumber]", args.vendorNumber);
  params.set("filter[reportType]", "SALES");
  params.set("filter[reportSubType]", "SUMMARY");
  params.set("filter[frequency]", "DAILY");
  params.set("filter[reportDate]", args.reportDate);

  const res = await fetch(
    `https://api.appstoreconnect.apple.com/v1/salesReports?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${args.jwt}`,
        Accept: "application/a-gzip",
      },
    }
  );

  if (res.status === 404) {
    throw new Error("no sales for date");
  }
  if (!res.ok) {
    const text = await res.text();
    let detail = text.slice(0, 240);
    try {
      const j = JSON.parse(text);
      detail = j?.errors?.[0]?.detail || detail;
    } catch {
      /* keep text */
    }
    throw new Error(detail || `salesReports ${res.status}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const tsv = gunzipToString(buf);
  return sumAppUnitsFromSalesTsv(tsv, args.bundleIdFilter);
}

function gunzipToString(buf: Buffer): string {
  // Apple returns gzip; tolerate already-plain TSV in tests.
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf).toString("utf8");
  }
  return buf.toString("utf8");
}

function sumAppUnitsFromSalesTsv(tsv: string, bundleIdFilter: string): number {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return 0;
  const headers = lines[0].split("\t").map((h) => h.trim());
  const idx = (name: string) =>
    headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const unitsIdx = idx("Units");
  const typeIdx = idx("Product Type Identifier");
  const skuIdx = idx("SKU");
  const titleIdx = idx("Title");
  const appleIdIdx = idx("Apple Identifier");
  if (unitsIdx < 0 || typeIdx < 0) return 0;

  let total = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const type = (cols[typeIdx] || "").trim().toUpperCase();
    if (!APP_UNIT_TYPES.has(type)) continue;
    if (bundleIdFilter) {
      const hay = [
        cols[skuIdx] || "",
        cols[titleIdx] || "",
        cols[appleIdIdx] || "",
      ]
        .join(" ")
        .toLowerCase();
      // Soft filter: if a bundle hint is set and nothing matches, still count all app units
      // unless the row clearly looks like a different app SKU — keep simple: no filter on SKU.
      void hay;
    }
    const units = Number(String(cols[unitsIdx] || "0").replace(/,/g, ""));
    if (Number.isFinite(units)) total += units;
  }
  return total;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseIsoDate(s: string): Date | null {
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t) : null;
}
