# Holiday search program 2026

**Today:** 18 August 2026  
**Code:** `lib/seo-guides.ts`, `/guides`, `/guides/[slug]`  
**Rule:** evergreen paths; do not auto-increment years; scheduled pages 404 until `status: indexable` and `publishAfter`.

INTERTEXE will not generate a new URL for every gift idea. Holiday demand is served by **editorially approved hubs** that link to existing material and collection pages.

## URL design

Pattern: `https://www.intertexe.com/guides/{evergreen-slug}`

Keep the slug when the year changes. Update visible copy and `lastReviewed` only after a human checks inventory.

## By 31 August 2026 — published (`indexable`)

| Hub | Path |
| --- | --- |
| Fall 2026 material guide | `/guides/fall-2026-materials` |
| Wool coats for fall and winter | `/guides/wool-coats-fall-winter` |
| Cashmere sweaters worth the price | `/guides/cashmere-sweaters-worth-the-price` |
| Better-material fall workwear | `/guides/better-material-fall-workwear` |
| Transitional dresses | `/guides/transitional-dresses` |
| How to evaluate coat composition | `/guides/evaluate-coat-composition` |

These pages include unique introductions, qualification rules, inspection lists, price-versus-fiber context, selection notes, review dates, and bounded product examples when a fiber/category query is configured.

## By 15 September 2026 — scheduled (not indexed yet)

- `/guides/holiday-party-dresses-by-material`
- `/guides/natural-fiber-holiday-outfits`
- `/guides/holiday-fabrics-velvet-silk-satin-sequins`
- `/guides/investment-accessories-material-quality`
- `/guides/holiday-travel-wardrobe-by-climate`

To publish: set `status: "indexable"` after reviewing copy against live inventory. Do not flip the flag from a cron.

## By 1 October 2026 — scheduled

- `/guides/black-friday-fashion-quality`
- `/guides/black-friday-quality-finds`
- `/guides/avoid-overpaying-for-polyester`
- `/guides/winter-coat-composition`
- `/guides/cashmere-gift-guide`
- `/guides/silk-gift-guide`
- `/guides/gifts-for-material-conscious-shoppers`

## By 1 November 2026 — scheduled

- `/guides/holiday-dress-edit`
- `/guides/holiday-gifts-by-material-and-price`
- `/guides/luxury-gifts-better-composition`
- `/guides/stocking-stuffers-natural-fibers`
- `/guides/new-years-eve-dresses-by-fabric`
- `/guides/resort-winter-sun-materials`

## Existing pages that already support holiday intent

Do not duplicate these as new filter URLs:

- `/materials/silk-dresses-evening`
- `/materials/wool-coats`
- `/materials/cashmere-sweaters`
- `/collections/evening`
- `/collections/vacation`
- `/sale`

## Ownership

Editorial owner: INTERTEXE (Khiteri). Engineering must not auto-rewrite `dateModified` on regenerate. Article JSON-LD uses `publishAfter` and `lastReviewed` from the registry.
