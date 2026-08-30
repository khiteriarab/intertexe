-- Performance indexes for high-traffic catalog endpoints (fiber/search/sale).

create extension if not exists pg_trgm;

create index concurrently if not exists idx_products_region_nfp_created
on public.products (region, natural_fiber_percent desc, created_at desc);

create index concurrently if not exists idx_products_region_sale_nfp
on public.products (region, is_sale, natural_fiber_percent desc)
where is_sale = true;

create index concurrently if not exists idx_products_composition_trgm
on public.products using gin (composition gin_trgm_ops);

create index concurrently if not exists idx_products_title_trgm
on public.products using gin (title gin_trgm_ops);

create index concurrently if not exists idx_products_brand_name_trgm
on public.products using gin (brand_name gin_trgm_ops);
