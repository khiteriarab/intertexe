-- Ensure curator unfavorite immediately stops pushing the product as an editor pick.
-- Adds a SECURITY DEFINER RPC the app can call after alias deletes (belt-and-suspenders
-- with trg_sync_editor_pick), and refreshes the alias-safe trigger function.

CREATE OR REPLACE FUNCTION public.sync_editor_pick_from_favorite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  curator_email text := 'khiteriarab@gmail.com';
  curator_id text;
  fav_product_id text;
  still_favorited boolean;
BEGIN
  SELECT id::text INTO curator_id
  FROM auth.users
  WHERE lower(email) = lower(curator_email)
  LIMIT 1;

  IF curator_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.user_id = curator_id THEN
    UPDATE public.products p
       SET is_editor_pick = true,
           editor_picked_at = COALESCE(p.editor_picked_at, now()),
           updated_at = now()
     WHERE p.id::text = NEW.product_id
        OR p.product_id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.user_id = curator_id THEN
    fav_product_id := OLD.product_id;

    SELECT EXISTS (
      SELECT 1
        FROM public.product_favorites f
        JOIN public.products p
          ON p.id::text = f.product_id OR p.product_id = f.product_id
       WHERE f.user_id = curator_id
         AND (p.id::text = fav_product_id OR p.product_id = fav_product_id)
    ) INTO still_favorited;

    IF NOT still_favorited THEN
      UPDATE public.products p
         SET is_editor_pick = false,
             editor_picked_at = NULL,
             updated_at = now()
       WHERE p.id::text = fav_product_id
          OR p.product_id = fav_product_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_editor_picks_for_products(p_product_ids text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  curator_email text := 'khiteriarab@gmail.com';
  caller_id text := auth.uid()::text;
  curator_id text;
  updated_count integer := 0;
BEGIN
  IF caller_id IS NULL OR p_product_ids IS NULL OR array_length(p_product_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT id::text INTO curator_id
  FROM auth.users
  WHERE lower(email) = lower(curator_email)
  LIMIT 1;

  -- Only the curator account may clear merchandising flags.
  IF curator_id IS NULL OR caller_id <> curator_id THEN
    RETURN 0;
  END IF;

  UPDATE public.products p
     SET is_editor_pick = false,
         editor_picked_at = NULL,
         updated_at = now()
   WHERE p.is_editor_pick IS TRUE
     AND (
       p.id::text = ANY (p_product_ids)
       OR p.product_id = ANY (p_product_ids)
     );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_editor_picks_for_products(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_editor_picks_for_products(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_editor_picks_for_products(text[]) TO service_role;
