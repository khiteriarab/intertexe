#!/usr/bin/env node
/**
 * Scan tracked source for secret-like patterns without printing secret values.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

const PATTERNS = [
  { name: "private_key_block", re: /BEGIN [A-Z ]*PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\s]{80,}/ },
  { name: "supabase_service_role_assignment", re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['\"]eyJ/ },
  { name: "live_api_key_literal", re: /itx_live_[A-Za-z0-9_-]{20,}/ },
  { name: "test_api_key_literal", re: /itx_test_[A-Za-z0-9_-]{20,}/ },
  { name: "github_pat", re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: "aws_access_key", re: /AKIA[0-9A-Z]{16}/ },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|sql|env|html|css)$/i.test(entry.name) || entry.name.startsWith(".env")) {
      if (entry.name === ".env" || entry.name.startsWith(".env.")) {
        files.push(full);
        continue;
      }
      files.push(full);
    }
  }
  return files;
}

const files = walk(ROOT).filter((file) => !file.includes(`${path.sep}scripts${path.sep}secret-scan.mjs`));
const hits = [];

for (const file of files) {
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const rel = path.relative(ROOT, file);
  if (rel === ".env.example") continue;
  for (const pattern of PATTERNS) {
    if (pattern.re.test(text)) {
      hits.push({ file: rel, pattern: pattern.name });
    }
  }
}

if (hits.length) {
  console.error("Secret scan failed. Pattern names and files only:");
  for (const hit of hits) {
    console.error(`${hit.file}: ${hit.pattern}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} files).`);
