-- Designer PLPs filter by brand/region/displayability and use this exact sort.
-- Without a matching partial index, cold requests scan and sort thousands of
-- product rows before returning the first 24–48 cards.
CREATE INDEX IF NOT EXISTS products_designer_plp_fast_idx
  ON public.products (
    brand_slug,
    region,
    is_sale DESC,
    natural_fiber_percent DESC,
    created_at DESC,
    id DESC
  )
  WHERE is_displayable IS TRUE
    AND natural_fiber_percent >= 70;
