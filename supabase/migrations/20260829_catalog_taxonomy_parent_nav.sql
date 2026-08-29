-- Activate parent navigation nodes; browse/filter uses active descendant leaves only.

CREATE OR REPLACE FUNCTION public.catalog_taxonomy_active_descendant_slugs(p_slug text)
RETURNS text[]
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  WITH RECURSIVE tree AS (
    SELECT n.slug, n.is_active, n.is_provisional
    FROM public.catalog_taxonomy_nodes n
    WHERE n.slug = p_slug
    UNION ALL
    SELECT c.slug, c.is_active, c.is_provisional
    FROM public.catalog_taxonomy_nodes c
    JOIN tree t ON c.parent_slug = t.slug
  )
  SELECT coalesce(array_agg(slug ORDER BY slug), ARRAY[]::text[])
  FROM tree
  WHERE is_active IS TRUE AND is_provisional IS FALSE;
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
    RETURN NULL;
  END IF;
  RETURN public.catalog_taxonomy_active_descendant_slugs(s);
END;
$$;

UPDATE public.catalog_taxonomy_nodes
SET is_active = true, updated_at = now()
WHERE slug IN ('clothing/tops', 'shoes/flat-shoes', 'shoes/heels');

NOTIFY pgrst, 'reload schema';

GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_active_descendant_slugs(text) TO service_role;
