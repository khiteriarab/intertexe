-- =============================================================================
-- Consumer catalog retail taxonomy (clothing + shoes)
-- Assignments at offer level (products.id) — matches catalog_browse_page_v2 parity key.
-- Parent browse resolves descendant slugs; no also_member_of column.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.catalog_taxonomy_nodes (
  slug text PRIMARY KEY,
  parent_slug text REFERENCES public.catalog_taxonomy_nodes (slug) ON DELETE RESTRICT,
  department text NOT NULL CHECK (department IN ('clothing', 'shoes')),
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  min_count_threshold int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_taxonomy_nodes_dept_sort_idx
  ON public.catalog_taxonomy_nodes (department, sort_order);

CREATE TABLE IF NOT EXISTS public.product_taxonomy_assignments (
  offer_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  taxonomy_slug text NOT NULL REFERENCES public.catalog_taxonomy_nodes (slug) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  source text NOT NULL CHECK (
    source IN (
      'retailer_category',
      'garment_type',
      'guarded_rule',
      'model_classification',
      'manual_override'
    )
  ),
  confidence smallint NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  taxonomy_version text NOT NULL DEFAULT 'retail-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (offer_id, taxonomy_slug)
);

CREATE INDEX IF NOT EXISTS idx_pta_taxonomy_offer
  ON public.product_taxonomy_assignments (taxonomy_slug, offer_id);

CREATE INDEX IF NOT EXISTS idx_pta_offer_primary
  ON public.product_taxonomy_assignments (offer_id)
  WHERE is_primary IS TRUE;

COMMENT ON TABLE public.catalog_taxonomy_nodes IS
  'Supabase-driven retail taxonomy menu. is_active gates customer-facing navigation after QA.';
COMMENT ON TABLE public.product_taxonomy_assignments IS
  'Offer-level taxonomy membership. Parent slugs resolve via catalog_taxonomy_descendant_slugs().';

-- -----------------------------------------------------------------------------
-- Seed nodes (is_active=false until backfill + QA)
-- -----------------------------------------------------------------------------
INSERT INTO public.catalog_taxonomy_nodes (slug, parent_slug, department, label, sort_order, is_active, min_count_threshold)
VALUES
  ('clothing/all', NULL, 'clothing', 'All Clothing', 0, false, 0),
  ('clothing/dresses', NULL, 'clothing', 'Dresses', 10, false, 100),
  ('clothing/bridal-dresses', 'clothing/dresses', 'clothing', 'Bridal Dresses', 11, false, 0),
  ('clothing/tops', NULL, 'clothing', 'Tops', 20, false, 100),
  ('clothing/shirts', 'clothing/tops', 'clothing', 'Shirts', 21, false, 100),
  ('clothing/blouses', 'clothing/tops', 'clothing', 'Blouses', 22, false, 50),
  ('clothing/tanks-and-camisoles', 'clothing/tops', 'clothing', 'Tanks and Camisoles', 23, false, 50),
  ('clothing/trousers', NULL, 'clothing', 'Trousers', 30, false, 100),
  ('clothing/jeans', NULL, 'clothing', 'Jeans', 31, false, 100),
  ('clothing/skirts', NULL, 'clothing', 'Skirts', 40, false, 100),
  ('clothing/shorts', NULL, 'clothing', 'Shorts', 50, false, 0),
  ('clothing/knitwear', NULL, 'clothing', 'Knitwear', 60, false, 100),
  ('clothing/coats', NULL, 'clothing', 'Coats', 70, false, 100),
  ('clothing/jackets', NULL, 'clothing', 'Jackets', 80, false, 100),
  ('clothing/matching-sets', NULL, 'clothing', 'Matching Sets', 90, false, 100),
  ('clothing/swimwear', NULL, 'clothing', 'Swimwear and Beachwear', 100, false, 0),

  ('shoes/all', NULL, 'shoes', 'All Shoes', 0, false, 0),
  ('shoes/flat-shoes', NULL, 'shoes', 'Flat Shoes', 10, false, 100),
  ('shoes/ballet-flats', 'shoes/flat-shoes', 'shoes', 'Ballet Flats', 11, false, 0),
  ('shoes/loafers', 'shoes/flat-shoes', 'shoes', 'Loafers', 12, false, 50),
  ('shoes/mary-janes', 'shoes/flat-shoes', 'shoes', 'Mary Janes', 13, false, 0),
  ('shoes/sneakers', NULL, 'shoes', 'Sneakers', 20, false, 50),
  ('shoes/boots', NULL, 'shoes', 'Boots', 30, false, 50),
  ('shoes/ankle-boots', 'shoes/boots', 'shoes', 'Ankle Boots', 31, false, 50),
  ('shoes/heels', NULL, 'shoes', 'Heels', 40, false, 50),
  ('shoes/pumps', 'shoes/heels', 'shoes', 'Pumps', 41, false, 50),
  ('shoes/heeled-sandals', 'shoes/heels', 'shoes', 'Heeled Sandals', 42, false, 0),
  ('shoes/sandals', NULL, 'shoes', 'Sandals', 50, false, 50),
  ('shoes/mules', NULL, 'shoes', 'Mules', 60, false, 50)
ON CONFLICT (slug) DO UPDATE SET
  parent_slug = EXCLUDED.parent_slug,
  department = EXCLUDED.department,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  min_count_threshold = EXCLUDED.min_count_threshold,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Descendant slug resolution (parent browse = union of subtree assignments)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_descendant_slugs(p_slug text)
RETURNS text[]
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  WITH RECURSIVE tree AS (
    SELECT n.slug
    FROM public.catalog_taxonomy_nodes n
    WHERE n.slug = p_slug
    UNION ALL
    SELECT c.slug
    FROM public.catalog_taxonomy_nodes c
    JOIN tree t ON c.parent_slug = t.slug
  )
  SELECT coalesce(array_agg(slug ORDER BY slug), ARRAY[]::text[])
  FROM tree;
$$;

-- All slugs in a department (for clothing/all, shoes/all)
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_department_slugs(p_department text)
RETURNS text[]
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(array_agg(slug ORDER BY sort_order, slug), ARRAY[]::text[])
  FROM public.catalog_taxonomy_nodes
  WHERE department = lower(trim(p_department))
    AND slug NOT LIKE '%/all';
$$;

CREATE OR REPLACE FUNCTION public.catalog_taxonomy_filter_slugs(p_slug text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  s text := trim(coalesce(p_slug, ''));
BEGIN
  IF s = '' THEN RETURN NULL; END IF;
  IF s IN ('clothing/all', 'shoes/all') THEN
    RETURN public.catalog_taxonomy_department_slugs(split_part(s, '/', 1));
  END IF;
  RETURN public.catalog_taxonomy_descendant_slugs(s);
END;
$$;

-- -----------------------------------------------------------------------------
-- Region offer counts per slug (deduplicated offer ids)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_node_counts(
  p_department text,
  p_region text DEFAULT 'us'
)
RETURNS TABLE (slug text, live_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH dept AS (
    SELECT slug FROM public.catalog_taxonomy_nodes
    WHERE department = lower(trim(p_department))
  ),
  region_offers AS (
    SELECT l.id
    FROM public.live_products_apparel l
    WHERE lower(coalesce(l.region, '')) = lower(trim(coalesce(p_region, 'us')))
  ),
  footwear_offers AS (
    SELECT f.id
    FROM public.live_products_footwear f
    WHERE lower(coalesce(f.region, '')) = lower(trim(coalesce(p_region, 'us')))
  ),
  base AS (
    SELECT d.slug,
      CASE
        WHEN lower(trim(p_department)) = 'shoes' THEN (
          SELECT count(DISTINCT pta.offer_id)::bigint
          FROM public.product_taxonomy_assignments pta
          JOIN footwear_offers fo ON fo.id = pta.offer_id
          WHERE pta.taxonomy_slug = ANY(public.catalog_taxonomy_filter_slugs(d.slug))
        )
        ELSE (
          SELECT count(DISTINCT pta.offer_id)::bigint
          FROM public.product_taxonomy_assignments pta
          JOIN region_offers ro ON ro.id = pta.offer_id
          WHERE pta.taxonomy_slug = ANY(public.catalog_taxonomy_filter_slugs(d.slug))
        )
      END AS live_count
    FROM dept d
  )
  SELECT slug, coalesce(live_count, 0)::bigint FROM base;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_descendant_slugs(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_department_slugs(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_filter_slugs(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_node_counts(text, text) TO anon, authenticated, service_role;

GRANT SELECT ON public.catalog_taxonomy_nodes TO anon, authenticated, service_role;
GRANT SELECT ON public.product_taxonomy_assignments TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
