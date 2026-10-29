import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");

test("capture API routes use service-role client, not user-JWT supabase", () => {
  const files = [
    "app/api/capture/route.ts",
    "app/api/capture/[id]/route.ts",
    "app/api/capture/[id]/decode/route.ts",
    "app/api/capture/events/route.ts",
  ];
  for (const file of files) {
    const src = readFileSync(join(root, file), "utf8");
    assert.match(src, /getCaptureServiceClient/, `${file} must use service client`);
    assert.doesNotMatch(src, /function userClient/, `${file} must not define userClient`);
    assert.doesNotMatch(
      src,
      /createClient\(/,
      `${file} must not build a user-JWT supabase client`
    );
  }
});

test("migration restores authenticated grants on external_captures", () => {
  const src = readFileSync(
    join(root, "supabase/migrations/20261029140000_restore_external_captures_user_access.sql"),
    "utf8"
  );
  assert.match(src, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.external_captures TO authenticated/);
  assert.match(src, /external_captures_select_own/);
  assert.match(src, /GRANT SELECT, INSERT ON TABLE public\.capture_events TO authenticated/);
});
