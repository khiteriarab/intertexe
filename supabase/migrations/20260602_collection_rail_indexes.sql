-- Improve editorial collection rail lookups used by /api/catalog?collection=...

create index concurrently if not exists idx_collection_memberships_slug_offer
on public.collection_product_memberships (collection_slug, offer_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'collection_slug'
  ) then
    execute 'create index concurrently if not exists idx_products_collection_slug_region on public.products (collection_slug, region) where collection_slug is not null';
  end if;
end
$$;
