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
      daysBack: 21,
    });

    // Weekly fallback when daily rows are empty (new apps / lag).
    if (Object.keys(byDate).filter((k) => k !== "__errors" && k !== "__meta").length === 0) {
      const weekly = await fetchWeeklyAppUnits({
        jwt,
        vendorNumber,
        bundleIdFilter,
      });
      if (weekly.units != null && weekly.weekStart) {
        byDate[weekly.weekStart] = weekly.units;
      }
      if (weekly.error) {
        const errs = byDate.__errors || [];
        errs.push(weekly.error);
        byDate.__errors = errs;
      }
    }

    const dates = Object.keys(byDate)
      .filter((k) => k !== "__errors" && k !== "__meta")
      .sort();
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

    const appUnitsLatestDay = latestDate ? byDate[latestDate] || 0 : 0;
    const appUnits7d = latestDate ? sumRange(0, 7) : 0;
    const appUnitsPrev7d = latestDate ? sumRange(7, 7) : 0;
    const appUnits30d = latestDate ? sumRange(0, Math.min(30, Math.max(dates.length, 1))) : 0;

    const daily = dates.slice(-14).map((date) => ({
      date,
      appUnits: byDate[date] || 0,
    }));

    const fetchErrors = byDate.__errors || [];
    const metaInfo = byDate.__meta || {};
    const vendorLooksWrong = fetchErrors.some((e) =>
      /vendor|forbidden|unauthorized|not valid|invalid/i.test(e)
    );

    const warnings: string[] = [];
    if (dates.length === 0) {
      warnings.push(
        vendorLooksWrong
          ? "Sales API rejected this Vendor Number — double-check it in Payments and Financial Reports."
          : "No Sales SUMMARY rows in the last ~3 weeks yet (normal before first downloads, or reports still lagging)."
      );
    }
    warnings.push(...fetchErrors.slice(0, 2));

    return {
      metrics: {
        syncedAt: new Date().toISOString(),
        appsVisible: apps.length,
        appNames: appSummaries.map((a) => a.name).filter(Boolean),
        vendorNumber,
        vendorNumberHint: vendorNumber.length > 2 ? `…${vendorNumber.slice(-2)}` : null,
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
        emptyReportDays: metaInfo.emptyDays ?? null,
        ...(warnings.length ? { setupWarnings: warnings } : {}),
        // Hard error only when Apple rejects the vendor / auth for Sales.
        ...(vendorLooksWrong
          ? {
              ascError:
                fetchErrors[0] ||
                "Sales API rejected this Vendor Number — reconnect with the correct one.",
            }
          : {}),
      },
      raw: {
        apps: appSummaries,
        daily,
        vendorNumberHint: vendorNumber.length > 2 ? `…${vendorNumber.slice(-2)}` : null,
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
}): Promise<Record<string, number> & { __errors?: string[]; __meta?: { emptyDays: number } }> {
  const out: Record<string, number> & {
    __errors?: string[];
    __meta?: { emptyDays: number };
  } = {};
  const errors: string[] = [];
  let emptyDays = 0;
  const today = new Date();
  for (let i = 1; i <= args.daysBack; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    const reportDate = isoDate(d);
    try {
      const units = await fetchOneSalesReport({
        jwt: args.jwt,
        vendorNumber: args.vendorNumber,
        frequency: "DAILY",
        reportDate,
        bundleIdFilter: args.bundleIdFilter,
      });
      if (units != null) out[reportDate] = units;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no sales|404|not found|empty report|no data/i.test(msg)) {
        emptyDays += 1;
      } else {
        errors.push(`${reportDate}: ${msg}`.slice(0, 180));
      }
    }
  }
  if (errors.length) out.__errors = errors;
  out.__meta = { emptyDays };
  return out;
}

async function fetchWeeklyAppUnits(args: {
  jwt: string;
  vendorNumber: string;
  bundleIdFilter: string;
}): Promise<{ weekStart: string | null; units: number | null; error?: string }> {
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun
  const lastSunday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (day || 7))
  );
  const weekStart = isoDate(lastSunday);
  try {
    const units = await fetchOneSalesReport({
      jwt: args.jwt,
      vendorNumber: args.vendorNumber,
      frequency: "WEEKLY",
      reportDate: weekStart,
      bundleIdFilter: args.bundleIdFilter,
    });
    return { weekStart, units: units ?? 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/no sales|404|not found|empty report|no data/i.test(msg)) {
      return { weekStart, units: null };
    }
    return { weekStart, units: null, error: `weekly: ${msg}`.slice(0, 180) };
  }
}

async function fetchOneSalesReport(args: {
  jwt: string;
  vendorNumber: string;
  frequency: "DAILY" | "WEEKLY";
  reportDate: string;
  bundleIdFilter: string;
}): Promise<number | null> {
  const params = new URLSearchParams();
  params.set("filter[vendorNumber]", args.vendorNumber);
  params.set("filter[reportType]", "SALES");
  params.set("filter[reportSubType]", "SUMMARY");
  params.set("filter[frequency]", args.frequency);
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

  if (!res.ok) {
    const text = await res.text();
    let detail = text.slice(0, 240);
    try {
      const j = JSON.parse(text);
      detail = j?.errors?.[0]?.detail || j?.errors?.[0]?.code || detail;
    } catch {
      /* keep text */
    }
    if (res.status === 404) {
      throw new Error(detail || "no sales for date");
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
      const hay = [cols[skuIdx] || "", cols[titleIdx] || "", cols[appleIdIdx] || ""]
        .join(" ")
        .toLowerCase();
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
