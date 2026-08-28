-- Pointers only. Customer catalogs stay on obelisk-core.
-- Do not add product, source, issue, or passport tables here.

ALTER TABLE public.hq_deals
  ADD COLUMN IF NOT EXISTS enterprise_organization_id uuid;

ALTER TABLE public.hq_deals
  ADD COLUMN IF NOT EXISTS enterprise_organization_slug text;

ALTER TABLE public.hq_deals
  ADD COLUMN IF NOT EXISTS enterprise_pilot_status text;

ALTER TABLE public.hq_deals
  ADD COLUMN IF NOT EXISTS enterprise_implementation_status text;

COMMENT ON COLUMN public.hq_deals.enterprise_organization_id IS
  'obelisk-core organizations.id reference only. Do not replicate catalog rows into HQ.';

CREATE INDEX IF NOT EXISTS hq_deals_enterprise_org_idx
  ON public.hq_deals (enterprise_organization_id);
