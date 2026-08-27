-- Environment, classification, HQ-safe conventions, governed benchmarks.

DO $$ BEGIN
  CREATE TYPE public.enterprise_environment AS ENUM ('local', 'staging', 'production');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_data_classification AS ENUM (
    'public_demo', 'customer_confidential', 'internal', 'synthetic_test'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS environment public.enterprise_environment NOT NULL DEFAULT 'production';

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS data_classification public.enterprise_data_classification NOT NULL DEFAULT 'customer_confidential';

UPDATE public.organizations
SET
  data_classification = 'public_demo',
  environment = 'production'
WHERE is_demo = true;

UPDATE public.organizations
SET data_classification = 'internal'
WHERE is_customer_zero = true;

CREATE TABLE IF NOT EXISTS public.deployment_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.deployment_settings (key, value) VALUES
  ('project', 'obelisk-core'),
  ('forbids_consumer_fallback', 'true'),
  ('demo_slug', 'intertexe-demo')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.deployment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deployment_settings_read ON public.deployment_settings;
CREATE POLICY deployment_settings_read ON public.deployment_settings
  FOR SELECT TO authenticated USING (true);

-- Governed aggregates only. No organization_id on metric rows.
ALTER TABLE public.benchmark_datasets
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.benchmark_datasets
  DROP CONSTRAINT IF EXISTS benchmark_datasets_status_chk;
ALTER TABLE public.benchmark_datasets
  ADD CONSTRAINT benchmark_datasets_status_chk
  CHECK (status IN ('draft', 'approved', 'retired'));

ALTER TABLE public.benchmark_datasets
  ADD COLUMN IF NOT EXISTS min_sample_size integer NOT NULL DEFAULT 5;

ALTER TABLE public.benchmark_datasets
  ADD COLUMN IF NOT EXISTS permission_scope text NOT NULL DEFAULT 'internal';

CREATE TABLE IF NOT EXISTS public.benchmark_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.benchmark_datasets (id) ON DELETE CASCADE,
  plan public.enterprise_plan_key NOT NULL,
  UNIQUE (dataset_id, plan)
);

ALTER TABLE public.benchmark_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS benchmark_permissions_read ON public.benchmark_permissions;
CREATE POLICY benchmark_permissions_read ON public.benchmark_permissions
  FOR SELECT TO authenticated USING (true);

-- Demo-only projection. Public demo code must query this, never organizations by slug param.
CREATE OR REPLACE VIEW public.demo_public_organizations AS
SELECT id, slug, name
FROM public.organizations
WHERE is_demo = true
  AND approved_for_public_demo = true
  AND data_classification = 'public_demo';

CREATE OR REPLACE FUNCTION public.assert_demo_org(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.demo_public_organizations WHERE id = target
  );
$$;

GRANT SELECT ON public.demo_public_organizations TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.assert_demo_org(uuid) TO authenticated, anon;
