-- Collapse size-SKU offers into one visible style card, and prefer higher
-- affiliate commission when the same style exists at multiple merchants
-- (e.g. 3.1 Phillip Lim direct MID 39906 vs MyTheresa).

CREATE OR REPLACE FUNCTION public.homepage_style_base_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT trim(both ' ' from lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              coalesce(p_name, ''),
              '\s*[-–|:]\s*size\s*[:.]?\s*[a-z0-9./+-]+\s*(women|womens|men|mens|us|uk|eu)?\s*$',
              '',
              'i'
            ),
            '\s+size\s*[:.]?\s*[a-z0-9./+-]+\s*(women|womens|men|mens|us|uk|eu)?\s*$',
            '',
            'i'
          ),
          '\s*[-–|/]\s*(xxxxl|xxxl|xxl|xl|xs|xxs|os|one\s*size|[sml])\s*$',
          '',
          'i'
        ),
        '\s+(xxxxl|xxxl|xxl|xl|xs|xxs|os|one\s*size|[sml])\s*$',
        '',
        'i'
      ),
      '\s*-\s*(black|white|grey|gray|ecru|navy|blue|red|pink|green|beige|khaki|brown|camel|cream|ivory|nude|sand|taupe|chocolate|burgundy|plum|powder|midnight|heather|medium|deep|light|dark|washed|faded|natural|stone|oatmeal|chalk|pearl|snow).*$',
      '',
      'i'
    )
  ));
$$;

COMMENT ON FUNCTION public.homepage_style_base_name(text) IS
  'Style base name with size SKU tokens stripped so S/M/L offers collapse to one card.';

-- Relative commission % by Rakuten MID (kind defaults until dashboard rates filled).
CREATE OR REPLACE FUNCTION public.catalog_merchant_commission_percent(p_retailer_mid text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE trim(coalesce(p_retailer_mid, ''))
    -- Explicit overrides (update from Rakuten publisher dashboard)
    -- WHEN '39906' THEN 12::numeric
    WHEN '39906' THEN 10::numeric  -- 3.1 Phillip Lim (brand)
    WHEN '49987' THEN 10::numeric
    WHEN '50739' THEN 10::numeric
    WHEN '46961' THEN 10::numeric
    WHEN '49384' THEN 10::numeric
    WHEN '41993' THEN 10::numeric
    WHEN '42841' THEN 10::numeric
    WHEN '42623' THEN 10::numeric
    WHEN '36145' THEN 10::numeric
    WHEN '52708' THEN 10::numeric
    WHEN '52963' THEN 10::numeric
    WHEN '43654' THEN 10::numeric
    WHEN '35663' THEN 5::numeric   -- MyTheresa
    WHEN '43172' THEN 5::numeric
    WHEN '13867' THEN 2.5::numeric -- Bloomingdale's
    WHEN '37206' THEN 2.5::numeric
    WHEN '50745' THEN 1.5::numeric -- ShopSimon marketplace
    ELSE 0::numeric
  END;
$$;

COMMENT ON FUNCTION public.catalog_merchant_commission_percent(text) IS
  'Affiliate commission % for offer ranking. Prefer highest % when style exists at multiple MIDs.';

-- Style-first card key: brand + size-stripped name (+ optional color).
-- Falls back to image / product_id / offer id. Prefer this over size-split canonicals.
CREATE OR REPLACE FUNCTION public.catalog_dedupe_key(
  p_image_url text,
  p_brand_name text,
  p_name text,
  p_composition text,
  p_product_id text,
  p_offer_id text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  brand text := lower(trim(regexp_replace(coalesce(p_brand_name, ''), '[^a-zA-Z0-9]+', ' ', 'g')));
  style text := lower(trim(regexp_replace(
    coalesce(public.homepage_style_base_name(p_name), ''),
    '[^a-zA-Z0-9]+', ' ', 'g'
  )));
  img text := lower(trim(split_part(split_part(coalesce(p_image_url, ''), '?', 1), '#', 1)));
  pid text := lower(trim(coalesce(p_product_id, '')));
  oid text := lower(trim(coalesce(p_offer_id, '')));
  comp text := lower(trim(regexp_replace(coalesce(p_composition, ''), '\s+', ' ', 'g')));
BEGIN
  brand := trim(both ' ' from brand);
  style := trim(both ' ' from style);
  IF brand <> '' AND length(style) >= 6 THEN
    RETURN 'style:' || brand || '|' || style;
  END IF;
  IF img <> '' THEN
    RETURN 'img:' || img;
  END IF;
  IF pid <> '' THEN
    RETURN 'pid:' || pid;
  END IF;
  IF brand <> '' AND style <> '' AND comp <> '' THEN
    RETURN 'identity:' || brand || '|' || style || '|' || comp;
  END IF;
  RETURN 'id:' || coalesce(nullif(oid, ''), 'unknown');
END;
$$;

COMMENT ON FUNCTION public.catalog_dedupe_key(text, text, text, text, text, text) IS
  'Display card key: size-stripped style first, then image, then product_id.';
