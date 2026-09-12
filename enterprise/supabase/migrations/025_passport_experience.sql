-- Passport Experience: presentation layer on top of governed product data.
-- One product record → one published passport → one experience config → template render.

CREATE TABLE IF NOT EXISTS public.passport_experience_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  template text NOT NULL DEFAULT 'editorial'
    CHECK (template IN ('editorial', 'essential', 'trace', 'circular')),
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_domain text,
  resolver_host text NOT NULL DEFAULT 'intertexe',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, product_id)
);

CREATE INDEX IF NOT EXISTS passport_experience_configs_org_idx
  ON public.passport_experience_configs (organization_id);

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS passport_experience_defaults jsonb NOT NULL DEFAULT '{"template":"editorial"}'::jsonb;

ALTER TABLE public.passport_experience_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY passport_experience_configs_select ON public.passport_experience_configs
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY passport_experience_configs_mutate ON public.passport_experience_configs
  FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

DROP TRIGGER IF EXISTS passport_experience_configs_updated_at ON public.passport_experience_configs;
CREATE TRIGGER passport_experience_configs_updated_at
  BEFORE UPDATE ON public.passport_experience_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.passport_experience_configs IS
  'Brand-controlled consumer passport presentation. Same governed data, template-driven rendering.';
