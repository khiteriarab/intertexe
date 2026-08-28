-- Canonical product hierarchy: style/model → variant. Identifiers stay distinct.

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES public.catalogs (id) ON DELETE SET NULL,
  name text NOT NULL,
  sku text,
  style_code text,
  category text,
  collection text,
  season text,
  lifecycle text NOT NULL DEFAULT 'active'
    CHECK (lifecycle IN ('active', 'archived')),
  data_completeness numeric,
  passport_state text,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_org_idx ON public.products (organization_id, last_updated_at DESC);
CREATE INDEX IF NOT EXISTS products_org_sku_idx ON public.products (organization_id, sku);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  name text,
  sku text,
  gtin text,
  color text,
  size text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, product_id, sku)
);

CREATE INDEX IF NOT EXISTS variants_org_idx ON public.variants (organization_id, product_id);

CREATE TABLE IF NOT EXISTS public.product_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.variants (id) ON DELETE CASCADE,
  identifier_type text NOT NULL,
  identifier_value text NOT NULL,
  issuing_system text,
  active boolean NOT NULL DEFAULT true,
  conflict_state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS product_identifiers_value_idx
  ON public.product_identifiers (organization_id, identifier_value);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_identifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select ON public.products FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY products_mutate ON public.products FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY variants_select ON public.variants FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY variants_mutate ON public.variants FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY identifiers_select ON public.product_identifiers FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY identifiers_mutate ON public.product_identifiers FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));
