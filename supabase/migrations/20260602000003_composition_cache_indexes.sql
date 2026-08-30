-- Fiber/material query acceleration for cold-path catalog requests.

create index concurrently if not exists idx_products_composition_gin
on public.products using gin (to_tsvector('english', coalesce(composition, '')))
where composition is not null;

create index concurrently if not exists idx_products_composition_text
on public.products (composition text_pattern_ops)
where composition is not null and is_displayable = true;
