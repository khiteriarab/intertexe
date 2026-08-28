-- Passports, versions, public identities, data carriers (QR/NFC).

CREATE TABLE IF NOT EXISTS public.passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.variants (id) ON DELETE SET NULL,
  public_id text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'incomplete'
    CHECK (state IN (
      'incomplete', 'review_required', 'ready', 'published', 'update_required', 'archived'
    )),
  current_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER passports_updated_at
  BEFORE UPDATE ON public.passports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.passport_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  passport_id uuid NOT NULL REFERENCES public.passports (id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  state text NOT NULL,
  published_at timestamptz,
  ruleset_version text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_summary text,
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (passport_id, version_number)
);

CREATE OR REPLACE FUNCTION public.forbid_published_passport_version_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'published passport versions are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS passport_versions_published_immutable ON public.passport_versions;
CREATE TRIGGER passport_versions_published_immutable
  BEFORE UPDATE OR DELETE ON public.passport_versions
  FOR EACH ROW EXECUTE FUNCTION public.forbid_published_passport_version_update();

CREATE TABLE IF NOT EXISTS public.data_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  passport_id uuid NOT NULL REFERENCES public.passports (id) ON DELETE CASCADE,
  carrier_type text NOT NULL CHECK (carrier_type IN ('qr', 'nfc', 'rfid')),
  artwork_variant text,
  public_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY passports_select ON public.passports FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY passports_mutate ON public.passports FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY passport_versions_select ON public.passport_versions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY passport_versions_insert ON public.passport_versions FOR INSERT TO authenticated
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY carriers_select ON public.data_carriers FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY carriers_mutate ON public.data_carriers FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));
