-- Tenant hardening: suppliers cannot browse the catalog.
-- Commercial metering, AI operations, mapping templates, export snapshots, persistent identities.

CREATE OR REPLACE FUNCTION public.can_view_org_records(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_member(target)
    AND public.org_role(target) IS DISTINCT FROM 'supplier_contributor';
$$;

REVOKE ALL ON FUNCTION public.can_view_org_records(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_org_records(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.supplier_assigned_product(target_product uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_requests r
    WHERE r.product_id = target_product
      AND r.assignee_user_id = public.current_profile_id()
      AND public.org_role(r.organization_id) = 'supplier_contributor'
  );
$$;

GRANT EXECUTE ON FUNCTION public.supplier_assigned_product(uuid) TO authenticated;

-- Recreate catalog SELECT policies so suppliers cannot enumerate org records.
DROP POLICY IF EXISTS catalogs_member_select ON public.catalogs;
CREATE POLICY catalogs_member_select ON public.catalogs FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS workspaces_member_select ON public.workspaces;
CREATE POLICY workspaces_member_select ON public.workspaces FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS memberships_member_select ON public.organization_memberships;
CREATE POLICY memberships_member_select ON public.organization_memberships FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id) OR user_id = public.current_profile_id());

DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated
  USING (
    public.can_view_org_records(organization_id)
    OR public.supplier_assigned_product(id)
  );

DROP POLICY IF EXISTS variants_select ON public.variants;
CREATE POLICY variants_select ON public.variants FOR SELECT TO authenticated
  USING (
    public.can_view_org_records(organization_id)
    OR public.supplier_assigned_product(product_id)
  );

DROP POLICY IF EXISTS identifiers_select ON public.product_identifiers;
CREATE POLICY identifiers_select ON public.product_identifiers FOR SELECT TO authenticated
  USING (
    public.can_view_org_records(organization_id)
    OR public.supplier_assigned_product(product_id)
  );

DROP POLICY IF EXISTS imports_select ON public.imports;
CREATE POLICY imports_select ON public.imports FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS source_select ON public.source_records;
CREATE POLICY source_select ON public.source_records FOR SELECT TO authenticated
  USING (
    public.can_view_org_records(organization_id)
    OR public.supplier_assigned_product(product_id)
  );

DROP POLICY IF EXISTS fields_select ON public.normalized_fields;
CREATE POLICY fields_select ON public.normalized_fields FOR SELECT TO authenticated
  USING (
    public.can_view_org_records(organization_id)
    OR public.supplier_assigned_product(product_id)
  );

DROP POLICY IF EXISTS jobs_select ON public.processing_jobs;
CREATE POLICY jobs_select ON public.processing_jobs FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS issues_select ON public.issues;
CREATE POLICY issues_select ON public.issues FOR SELECT TO authenticated
  USING (
    public.can_view_org_records(organization_id)
    OR public.supplier_assigned_product(product_id)
  );

DROP POLICY IF EXISTS missing_select ON public.missing_data_register;
CREATE POLICY missing_select ON public.missing_data_register FOR SELECT TO authenticated
  USING (
    public.can_view_org_records(organization_id)
    OR public.supplier_assigned_product(product_id)
  );

DROP POLICY IF EXISTS passports_select ON public.passports;
CREATE POLICY passports_select ON public.passports FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS passport_versions_select ON public.passport_versions;
CREATE POLICY passport_versions_select ON public.passport_versions FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS carriers_select ON public.data_carriers;
CREATE POLICY carriers_select ON public.data_carriers FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS evaluations_select ON public.regulatory_evaluations;
CREATE POLICY evaluations_select ON public.regulatory_evaluations FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS activity_select ON public.activity_events;
CREATE POLICY activity_select ON public.activity_events FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS files_select ON public.files;
CREATE POLICY files_select ON public.files FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS analytics_select ON public.analytics_events;
CREATE POLICY analytics_select ON public.analytics_events FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.can_view_org_records(organization_id));

-- Persistent public identity is distinct from internal UUIDs, SKUs, GTINs, and passport rows.
CREATE TABLE IF NOT EXISTS public.persistent_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.variants (id) ON DELETE SET NULL,
  public_id text NOT NULL UNIQUE,
  gs1_digital_link text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT persistent_identities_public_id_chk CHECK (public_id ~ '^[A-Za-z0-9_-]{8,80}$')
);

CREATE INDEX IF NOT EXISTS persistent_identities_org_idx
  ON public.persistent_identities (organization_id, product_id);

ALTER TABLE public.persistent_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY persistent_identities_select ON public.persistent_identities FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));
CREATE POLICY persistent_identities_mutate ON public.persistent_identities FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE TABLE IF NOT EXISTS public.import_mapping_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  source_system text,
  mapping jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_mapping_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY mapping_templates_select ON public.import_mapping_templates FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));
CREATE POLICY mapping_templates_mutate ON public.import_mapping_templates FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE TABLE IF NOT EXISTS public.export_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  export_type text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  query_scope jsonb,
  source_version text,
  checksum text,
  file_id uuid REFERENCES public.files (id) ON DELETE SET NULL
);

ALTER TABLE public.export_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY export_snapshots_select ON public.export_snapshots FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));
CREATE POLICY export_snapshots_mutate ON public.export_snapshots FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE TABLE IF NOT EXISTS public.ai_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.processing_jobs (id) ON DELETE SET NULL,
  provider text NOT NULL,
  model text,
  prompt_version text,
  input_ref text,
  output_ref text,
  confidence numeric,
  status public.enterprise_job_status NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_operations_select ON public.ai_operations FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));
CREATE POLICY ai_operations_mutate ON public.ai_operations FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE TABLE IF NOT EXISTS public.usage_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  period_start date NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  UNIQUE (organization_id, metric_key, period_start)
);

ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
CREATE POLICY usage_meters_select ON public.usage_meters FOR SELECT TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'));

CREATE TABLE IF NOT EXISTS public.billing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations (id) ON DELETE CASCADE,
  contract_value numeric,
  invoice_status text,
  amount_invoiced numeric NOT NULL DEFAULT 0,
  amount_collected numeric NOT NULL DEFAULT 0,
  amount_outstanding numeric NOT NULL DEFAULT 0,
  billing_period text,
  subscription_start date,
  renewal_date date,
  cancellation_state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER billing_accounts_updated_at
  BEFORE UPDATE ON public.billing_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_accounts_select ON public.billing_accounts FOR SELECT TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'));

-- Service-role only. Not granted to authenticated. Cascades org-owned rows.
CREATE OR REPLACE FUNCTION public.execute_organization_deletion(target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_slug text;
  product_count integer;
BEGIN
  SELECT slug INTO org_slug FROM public.organizations WHERE id = target;
  IF org_slug IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  SELECT count(*) INTO product_count FROM public.products WHERE organization_id = target;
  INSERT INTO public.organization_deletion_jobs (organization_id, status, summary)
  VALUES (
    target,
    'running',
    jsonb_build_object('slug', org_slug, 'products', product_count)
  );
  DELETE FROM public.organizations WHERE id = target;
  UPDATE public.organization_deletion_jobs
    SET status = 'succeeded', finished_at = now()
    WHERE organization_id = target AND status = 'running';
  RETURN jsonb_build_object(
    'ok', true,
    'slug', org_slug,
    'products_removed', product_count,
    'storage', 'app_job_must_delete_objects'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_organization_deletion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_organization_deletion(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.execute_organization_deletion(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.execute_organization_deletion(uuid) TO service_role;
