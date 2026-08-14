/**
 * Sheet → hq_contacts planner fixtures.
 * Run: node --import tsx --test scripts/hq-contacts-sheet-sync.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSheetId,
  typeFromTabTitle,
  headerIndexMap,
  rowToSheetContact,
  planSheetContactSync,
  assertNoSupabaseOwnedFields,
  SUPABASE_OWNED_FIELDS,
  gmailHasSheetsScope,
  type ExistingContact,
  type SheetOwnedRecord,
} from "../lib/dashboard/hq-contacts-sheet-sync.ts";

test("parseSheetId accepts URL or raw id", () => {
  assert.equal(
    parseSheetId("https://docs.google.com/spreadsheets/d/abc123_ID/edit#gid=0"),
    "abc123_ID"
  );
  assert.equal(parseSheetId("abc123_ID"), "abc123_ID");
});

test("tab titles map to canonical types", () => {
  assert.equal(typeFromTabTitle("CUSTOMERS"), "customer");
  assert.equal(typeFromTabTitle("Potential customers"), "customer");
  assert.equal(typeFromTabTitle("Influencers"), "influencer");
  assert.equal(typeFromTabTitle("Creators"), "influencer");
  assert.equal(typeFromTabTitle("BUSINESSES"), "business");
  assert.equal(typeFromTabTitle("Press"), null);
  assert.equal(typeFromTabTitle("Sheet1"), null);
});

test("row parser normalizes email and ignores blank rows", () => {
  const map = headerIndexMap(["Email", "First name", "Company"]);
  const ok = rowToSheetContact("Customers", "customer", map, ["  Ada@Intertexe.com ", "Ada", "INTERTEXE"]);
  assert.ok(!("invalid" in ok));
  if ("invalid" in ok) return;
  assert.equal(ok.email, "ada@intertexe.com");
  assert.equal(ok.normalized_email, "ada@intertexe.com");
  assert.equal(ok.first_name, "Ada");
  assert.equal(ok.company_name, "INTERTEXE");
  assert.equal(ok.source, "google_sheet");
  assert.equal(ok.sheet_tab, "Customers");
  const bad = rowToSheetContact("Customers", "customer", map, ["not-an-email", "Ada"]);
  assert.deepEqual(bad, { invalid: true });
});

function existing(partial: Partial<ExistingContact> & Pick<ExistingContact, "id" | "normalized_email">): ExistingContact {
  return {
    contact_type: "customer",
    first_name: null,
    last_name: null,
    full_name: null,
    name: null,
    company_name: null,
    notes: null,
    campaign: null,
    source: "google_sheet",
    sheet_tab: "Customers",
    outreach_status: "contacted",
    user_id: "user-1",
    first_contacted_at: "2026-08-01T10:00:00.000Z",
    last_contacted_at: "2026-08-14T10:00:00.000Z",
    last_replied_at: "2026-08-14T11:00:00.000Z",
    ...partial,
  };
}

function incoming(partial: Partial<SheetOwnedRecord> & Pick<SheetOwnedRecord, "email">): SheetOwnedRecord {
  const email = partial.email;
  return {
    normalized_email: email,
    first_name: "Ada",
    last_name: null,
    full_name: "Ada",
    name: "Ada",
    company_name: null,
    notes: null,
    campaign: null,
    contact_type: "customer",
    sheet_tab: "Customers",
    source: "google_sheet",
    ...partial,
    email,
    normalized_email: email,
  };
}

test("new emails insert without marketing opt-in; known accounts convert", () => {
  const plan = planSheetContactSync({
    incoming: [incoming({ email: "new@brand.com" }), incoming({ email: "user@intertexe.com" })],
    existing: [],
    usersByEmail: new Map([["user@intertexe.com", "uid-9"]]),
  });
  assert.equal(plan.insert.length, 2);
  const fresh = plan.insert.find((r) => r.email === "new@brand.com")!;
  assert.equal(fresh.outreach_status, "not_contacted");
  assert.equal(fresh.marketing_eligible, false);
  assert.equal(fresh.user_id, null);
  const known = plan.insert.find((r) => r.email === "user@intertexe.com")!;
  assert.equal(known.outreach_status, "converted");
  assert.equal(known.user_id, "uid-9");
});

test("sheet updates names but never outreach timestamps or user_id", () => {
  const plan = planSheetContactSync({
    incoming: [
      incoming({
        email: "ada@intertexe.com",
        first_name: "Adaline",
        company_name: "INTERTEXE",
        contact_type: "influencer",
        sheet_tab: "Influencers",
      }),
    ],
    existing: [
      existing({
        id: "c1",
        normalized_email: "ada@intertexe.com",
        first_name: "Ada",
      }),
    ],
    usersByEmail: new Map(),
  });
  assert.equal(plan.insert.length, 0);
  assert.equal(plan.update.length, 1);
  const patch = plan.update[0].patch as Record<string, unknown>;
  assert.equal(patch.first_name, "Adaline");
  assert.equal(patch.company_name, "INTERTEXE");
  assert.equal(patch.contact_type, "influencer");
  assert.equal(patch.sheet_tab, "Influencers");
  for (const key of SUPABASE_OWNED_FIELDS) {
    assert.equal(Object.prototype.hasOwnProperty.call(patch, key), false);
  }
  assertNoSupabaseOwnedFields(patch);
});

test("blank sheet cells do not wipe existing names or notes", () => {
  const plan = planSheetContactSync({
    incoming: [
      incoming({
        email: "ada@intertexe.com",
        first_name: null,
        last_name: null,
        full_name: null,
        name: null,
        notes: null,
      }),
    ],
    existing: [
      existing({
        id: "c1",
        normalized_email: "ada@intertexe.com",
        first_name: "Ada",
        notes: "met at Paris",
      }),
    ],
    usersByEmail: new Map(),
  });
  assert.equal(plan.update.length, 0);
  assert.equal(plan.alreadyCurrent, 1);
});

test("duplicate emails across tabs keep the first tab", () => {
  const plan = planSheetContactSync({
    incoming: [
      incoming({ email: "both@x.com", contact_type: "customer", sheet_tab: "Customers" }),
      incoming({ email: "both@x.com", contact_type: "influencer", sheet_tab: "Influencers" }),
    ],
    existing: [],
    usersByEmail: new Map(),
  });
  assert.equal(plan.insert.length, 1);
  assert.equal(plan.insert[0].contact_type, "customer");
  assert.equal(plan.dupesInSheet.length, 1);
  assert.equal(plan.dupesInSheet[0].droppedType, "influencer");
});

test("gmailHasSheetsScope detects reconnect need", () => {
  assert.equal(gmailHasSheetsScope(["https://www.googleapis.com/auth/gmail.readonly"]), false);
  assert.equal(
    gmailHasSheetsScope([
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ]),
    true
  );
});
