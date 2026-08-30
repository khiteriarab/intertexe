-- Fix editor-pick sync: only clear is_editor_pick when the curator has no
-- remaining favorite rows for that product (UUID or feed product_id aliases).
-- Alias collapse on the client previously deleted a duplicate favorite key and
-- wiped editor pick status even though the canonical favorite still existed.

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
