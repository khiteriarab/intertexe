-- Deactivate nodes failing independent precision audit (<98%):
-- clothing/shirts (89.66%), clothing/tanks-and-camisoles (92.31%)

UPDATE public.catalog_taxonomy_nodes
SET is_active = false, updated_at = now()
WHERE slug IN ('clothing/shirts', 'clothing/tanks-and-camisoles');

NOTIFY pgrst, 'reload schema';
