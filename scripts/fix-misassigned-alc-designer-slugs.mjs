/**
 * Re-slug designers incorrectly assigned to a-l-c- (substring match pollution).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const parentEnv = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");
const raw = readFileSync(parentEnv, "utf8");
const url = raw.match(/SUPABASE_URL=([^\n]+)/)?.[1]?.trim();
const key = raw.match(/SUPABASE_SERVICE_ROLE_KEY=([^\n]+)/)?.[1]?.trim();
const supabase = createClient(url, key);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const { data: rows } = await supabase.from("designers").select("id, name, slug").eq("slug", "a-l-c-");
let fixed = 0;
for (const row of rows || []) {
  const n = (row.name || "").toLowerCase().trim();
  if (n === "alc" || n === "a.l.c." || n === "a l c") continue;
  const newSlug = slugify(row.name);
  if (!newSlug || newSlug === "a-l-c-") continue;
  const { error } = await supabase.from("designers").update({ slug: newSlug }).eq("id", row.id);
  if (!error) {
    console.log(`Re-slugged ${row.name}: a-l-c- → ${newSlug}`);
    fixed++;
  } else {
    console.log(`Failed ${row.name}:`, error.message);
  }
}
console.log("Fixed:", fixed);
