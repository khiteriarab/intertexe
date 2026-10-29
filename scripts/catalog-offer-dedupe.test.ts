import assert from "node:assert/strict";
import { test } from "node:test";
import {
  catalogDedupeKey,
  catalogDisplayName,
  catalogStyleBaseName,
  dedupeCatalogRows,
  mergeSizeOptions,
  pickDedupeWinner,
} from "../lib/catalog-rules";
import { commissionPercentForMid } from "../lib/merchant-commission";

test("catalogStyleBaseName strips Size: tokens and letter sizes", () => {
  assert.equal(
    catalogStyleBaseName("French Terry Jogger Dream Size: S"),
    "french terry jogger dream"
  );
  assert.equal(
    catalogStyleBaseName("French Terry Jogger Dream Size: M"),
    "french terry jogger dream"
  );
  assert.equal(catalogStyleBaseName("French Terry Jogger Dream Xs"), "french terry jogger dream");
  assert.equal(
    catalogStyleBaseName("French Terry Jogger Grey Melange Size: S"),
    "french terry jogger grey melange"
  );
});

test("catalogDisplayName keeps readable title without size suffix", () => {
  assert.equal(
    catalogDisplayName("French Terry Jogger Dream Size: S"),
    "French Terry Jogger Dream"
  );
});

test("size SKUs of the same colorway share one dedupe key", () => {
  const a = catalogDedupeKey({
    brand_name: "3.1 Phillip Lim",
    name: "French Terry Jogger Dream Size: S",
    canonical_id: "canon-s",
    product_id: "sku-s",
    id: "1",
  });
  const b = catalogDedupeKey({
    brand_name: "3.1 Phillip Lim",
    name: "French Terry Jogger Dream Size: M",
    canonical_id: "canon-m",
    product_id: "sku-m",
    id: "2",
  });
  assert.equal(a, b);
  assert.match(a, /^style:/);
});

test("different colorways stay separate cards", () => {
  const dream = catalogDedupeKey({
    brand_name: "3.1 Phillip Lim",
    name: "French Terry Jogger Dream Size: S",
    id: "1",
  });
  const grey = catalogDedupeKey({
    brand_name: "3.1 Phillip Lim",
    name: "French Terry Jogger Grey Melange Size: S",
    id: "2",
  });
  assert.notEqual(dream, grey);
});

test("direct brand MID beats MyTheresa on commission", () => {
  assert.ok(commissionPercentForMid("39906") > commissionPercentForMid("43172"));

  const winner = pickDedupeWinner(
    [
      {
        id: "myt",
        region: "us",
        retailer_mid: "43172",
        natural_fiber_percent: 100,
        created_at: "2026-01-01",
        url: "https://mytheresa.example/jogger",
      },
      {
        id: "brand",
        region: "us",
        retailer_mid: "39906",
        natural_fiber_percent: 100,
        created_at: "2026-01-02",
        url: "https://philliplim.example/jogger",
      },
    ],
    "us",
    "us"
  );
  assert.equal(winner.id, "brand");
});

test("dedupeCatalogRows collapses size SKUs and keeps highest-commission URL", () => {
  const rows = dedupeCatalogRows(
    [
      {
        id: "s",
        brand_name: "3.1 Phillip Lim",
        name: "French Terry Jogger Dream Size: S",
        region: "us",
        retailer_mid: "43172",
        natural_fiber_percent: 100,
        url: "https://mytheresa.example/s",
        size_options: ["S"],
        created_at: "2026-01-01",
      },
      {
        id: "m",
        brand_name: "3.1 Phillip Lim",
        name: "French Terry Jogger Dream Size: M",
        region: "us",
        retailer_mid: "39906",
        natural_fiber_percent: 100,
        url: "https://philliplim.example/m",
        size_options: ["M"],
        created_at: "2026-01-02",
      },
      {
        id: "grey",
        brand_name: "3.1 Phillip Lim",
        name: "French Terry Jogger Grey Melange Size: S",
        region: "us",
        retailer_mid: "39906",
        natural_fiber_percent: 100,
        url: "https://philliplim.example/grey",
        size_options: ["S"],
        created_at: "2026-01-03",
      },
    ],
    "us",
    "us"
  );

  assert.equal(rows.length, 2);
  const dream = rows.find((r) => String(r.name).includes("Dream"));
  assert.ok(dream);
  assert.equal(dream!.retailer_mid, "39906");
  assert.equal(dream!.url, "https://philliplim.example/m");
});

test("mergeSizeOptions unions sibling SKU sizes", () => {
  assert.deepEqual(
    mergeSizeOptions([{ size_options: ["S"] }, { size_options: ["M", "S"] }, { sizeOptions: ["Xs"] }]),
    ["S", "M", "Xs"]
  );
});
