-- Fast catalog_classification_summary (indexed counts only; no live_products_apparel scan).

CREATE OR REPLACE VIEW public.catalog_classification_summary AS
SELECT
  (SELECT count(*)::bigint
   FROM public.products p
   WHERE p.approved = 'yes'
     AND coalesce(p.is_active, true) IS TRUE
     AND coalesce(p.natural_fiber_percent, 0) >= 80) AS live_apparel_offers,
  (SELECT count(*)::bigint FROM public.product_offer_classification) AS classified_offers,
  (SELECT count(*)::bigint
   FROM public.product_offer_classification
   WHERE completeness_status = 'complete') AS complete_offers,
  (SELECT count(*)::bigint
   FROM public.product_offer_classification
   WHERE completeness_status = 'needs_review') AS needs_review_offers,
  (SELECT count(*)::bigint FROM public.canonical_products) AS canonical_products,
  (SELECT card_count::bigint
   FROM public.catalog_material_hub_counts
   WHERE fiber = 'all' AND category = ''
   LIMIT 1) AS visible_catalog_cards_approx;

GRANT SELECT ON public.catalog_classification_summary TO anon, authenticated, service_role;
