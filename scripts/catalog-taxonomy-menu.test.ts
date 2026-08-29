import assert from "node:assert/strict";
import test from "node:test";
import {
  flattenTaxonomyMenu,
  isDepartmentAllSlug,
  resolveTaxonomyBrowseNode,
  taxonomyHref,
  type CatalogTaxonomyNode,
} from "../lib/catalog-taxonomy.ts";

const sampleNodes: CatalogTaxonomyNode[] = [
  {
    slug: "clothing/dresses",
    parentSlug: null,
    department: "clothing",
    label: "Dresses",
    sortOrder: 10,
    isActive: true,
    minCountThreshold: 100,
  },
  {
    slug: "clothing/all",
    parentSlug: null,
    department: "clothing",
    label: "All Clothing",
    sortOrder: 0,
    isActive: false,
    minCountThreshold: 0,
  },
];

test("taxonomyHref routes department-all to browse grid", () => {
  assert.equal(taxonomyHref("clothing", "clothing/all"), "/shop/clothing/all");
  assert.equal(taxonomyHref("shoes", "shoes/all"), "/shop/shoes/all");
});

test("resolveTaxonomyBrowseNode allows inactive clothing/all", () => {
  const node = resolveTaxonomyBrowseNode(sampleNodes, "clothing/all");
  assert.ok(node);
  assert.equal(node?.label, "All Clothing");
  assert.equal(node?.isActive, true);
});

test("resolveTaxonomyBrowseNode rejects inactive leaf categories", () => {
  const inactive = [
    {
      slug: "clothing/bridal-dresses",
      parentSlug: "clothing/dresses",
      department: "clothing" as const,
      label: "Bridal Dresses",
      sortOrder: 11,
      isActive: false,
      minCountThreshold: 0,
    },
  ];
  assert.equal(resolveTaxonomyBrowseNode(inactive, "clothing/bridal-dresses"), null);
});

test("flattenTaxonomyMenu excludes */all rows from API payload", () => {
  const rows = flattenTaxonomyMenu(sampleNodes);
  assert.equal(rows.some((row) => row.slug.endsWith("/all")), false);
  assert.equal(rows[0]?.href, "/shop/clothing/dresses");
});

test("isDepartmentAllSlug", () => {
  assert.equal(isDepartmentAllSlug("clothing/all"), true);
  assert.equal(isDepartmentAllSlug("clothing/dresses"), false);
});
