-- Immutable source records, normalized fields, processing jobs, import mapping.

CREATE TABLE IF NOT EXISTS public.imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES public.catalogs (id) ON DELETE SET NULL,
  idempotency_key text,
  original_filename text,
  mapping jsonb,
  mapping_version integer NOT NULL DEFAULT 1,
  preview jsonb,
  status public.enterprise_job_status NOT NULL DEFAULT 'queued',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  import_id uuid REFERENCES public.imports (id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.variants (id) ON DELETE SET NULL,
  source_system text,
  source_url text,
  retrieved_at timestamptz,
  original_payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS source_records_org_idx ON public.source_records (organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.forbid_source_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'source_records are immutable';
END;
$$;

DROP TRIGGER IF EXISTS source_records_immutable ON public.source_records;
CREATE TRIGGER source_records_immutable
  BEFORE UPDATE ON public.source_records
  FOR EACH ROW EXECUTE FUNCTION public.forbid_source_record_mutation();

CREATE TABLE IF NOT EXISTS public.normalized_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.variants (id) ON DELETE SET NULL,
  source_record_id uuid REFERENCES public.source_records (id) ON DELETE SET NULL,
  field_key text NOT NULL,
  original_value text,
  normalized_value text,
  transformation_method text,
  confidence numeric,
  state public.enterprise_field_state NOT NULL DEFAULT 'observed',
  access_class public.enterprise_access_class NOT NULL DEFAULT 'internal',
  explanation text,
  evidence_id uuid,
  reviewer_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  locked boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS normalized_fields_org_product_idx
  ON public.normalized_fields (organization_id, product_id, field_key);

CREATE TRIGGER normalized_fields_updated_at
  BEFORE UPDATE ON public.normalized_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  import_id uuid REFERENCES public.imports (id) ON DELETE SET NULL,
  job_type text NOT NULL,
  stage text,
  status public.enterprise_job_status NOT NULL DEFAULT 'queued',
  idempotency_key text,
  provider text,
  model text,
  prompt_version text,
  depends_on uuid REFERENCES public.processing_jobs (id) ON DELETE SET NULL,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY imports_select ON public.imports FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY imports_mutate ON public.imports FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY source_select ON public.source_records FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY source_insert ON public.source_records FOR INSERT TO authenticated
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY fields_select ON public.normalized_fields FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY fields_mutate ON public.normalized_fields FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY jobs_select ON public.processing_jobs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY jobs_mutate ON public.processing_jobs FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));
