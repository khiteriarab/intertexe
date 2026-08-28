-- Safe development seed. No confidential production catalog data. No auth users.

INSERT INTO public.organizations (
  slug, name, kind, plan, account_state, is_demo, is_customer_zero, approved_for_public_demo,
  product_allowance, passport_allowance, entitlements
) VALUES
  (
    'intertexe',
    'INTERTEXE',
    'customer_zero',
    'internal',
    'active',
    false,
    true,
    false,
    NULL,
    NULL,
    '{"unlimited": true}'::jsonb
  ),
  (
    'intertexe-demo',
    'INTERTEXE Demo Brand',
    'demo',
    'internal',
    'active',
    true,
    false,
    true,
    10,
    10,
    '{"public_demo": true, "product_limit": 10}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  is_demo = EXCLUDED.is_demo,
  is_customer_zero = EXCLUDED.is_customer_zero,
  approved_for_public_demo = EXCLUDED.approved_for_public_demo;

INSERT INTO public.workspaces (organization_id, slug, name)
SELECT id, 'default', 'Default workspace'
FROM public.organizations
WHERE slug IN ('intertexe', 'intertexe-demo')
ON CONFLICT (organization_id, slug) DO NOTHING;

INSERT INTO public.catalogs (organization_id, workspace_id, name)
SELECT o.id, w.id, 'Main catalog'
FROM public.organizations o
JOIN public.workspaces w ON w.organization_id = o.id AND w.slug = 'default'
WHERE o.slug IN ('intertexe', 'intertexe-demo')
AND NOT EXISTS (
  SELECT 1 FROM public.catalogs c WHERE c.organization_id = o.id AND c.name = 'Main catalog'
);
