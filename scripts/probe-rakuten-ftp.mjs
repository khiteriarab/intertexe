#!/usr/bin/env node
/**
 * Safe Rakuten FTP LIST probe — never downloads feeds or writes catalog.
 *
 * Usage:
 *   node scripts/probe-rakuten-ftp.mjs
 *
 * Loads .env / .env.local / .env.vercel.local if present (does not print secrets).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "basic-ftp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function normalizeSecret(value) {
  if (value == null) return "";
  return String(value)
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

const env = {
  ...loadEnvFile(path.join(root, "..", ".env")),
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.local")),
  ...loadEnvFile(path.join(root, ".env.vercel.local")),
  ...process.env,
};

const user = normalizeSecret(env.RAKUTEN_FTP_USERNAME || env.RAKUTEN_FTP_USER);
const password = normalizeSecret(env.RAKUTEN_FTP_PASSWORD);
const host = normalizeSecret(env.RAKUTEN_FTP_HOST) || "aftp.linksynergy.com";

console.log(
  JSON.stringify(
    {
      host,
      userLen: user.length,
      passwordLen: password.length,
      passwordLooksTruncated: password.length > 0 && password.length < 16,
    },
    null,
    2
  )
);

if (!user || !password) {
  console.error("Missing RAKUTEN_FTP_USERNAME/USER or RAKUTEN_FTP_PASSWORD");
  process.exit(2);
}

const client = new Client(45000);
try {
  client.ftp.ipFamily = 4;
} catch {
  /* older basic-ftp */
}

try {
  await client.access({ host, port: 21, user, password, secure: false });
  const list = await client.list(".");
  const dirs = list.filter((e) => e.type === 2).slice(0, 15).map((e) => e.name);
  const files = list
    .filter((e) => e.type !== 2)
    .slice(0, 15)
    .map((e) => e.name);
  console.log(
    JSON.stringify(
      { ok: true, entries: list.length, sampleDirs: dirs, sampleFiles: files },
      null,
      2
    )
  );
} catch (err) {
  console.log(
    JSON.stringify({ ok: false, error: String(err?.message || err) }, null, 2)
  );
  process.exitCode = 1;
} finally {
  client.close();
}
