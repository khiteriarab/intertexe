-- Own-row RLS for tables the iOS app and website share via the anon key + JWT.
-- Does not change public catalog tables or the barcode composition cache.

DO $$
BEGIN
  IF to_regclass('public.product_favorites') IS NOT NULL THEN
    ALTER TABLE public.product_favorites ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own product favorites" ON public.product_favorites;
    DROP POLICY IF EXISTS "Users can insert own product favorites" ON public.product_favorites;
    DROP POLICY IF EXISTS "Users can delete own product favorites" ON public.product_favorites;
    DROP POLICY IF EXISTS "Users can view own favorites" ON public.product_favorites;
    DROP POLICY IF EXISTS product_favorites_select_own ON public.product_favorites;
    DROP POLICY IF EXISTS product_favorites_insert_own ON public.product_favorites;
    DROP POLICY IF EXISTS product_favorites_delete_own ON public.product_favorites;
    CREATE POLICY product_favorites_select_own
      ON public.product_favorites FOR SELECT TO authenticated
      USING (user_id::text = auth.uid()::text);
    CREATE POLICY product_favorites_insert_own
      ON public.product_favorites FOR INSERT TO authenticated
      WITH CHECK (user_id::text = auth.uid()::text);
    CREATE POLICY product_favorites_delete_own
      ON public.product_favorites FOR DELETE TO authenticated
      USING (user_id::text = auth.uid()::text);
  END IF;

  IF to_regclass('public.favorites') IS NOT NULL THEN
    ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
    DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
    DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
    DROP POLICY IF EXISTS favorites_select_own ON public.favorites;
    DROP POLICY IF EXISTS favorites_insert_own ON public.favorites;
    DROP POLICY IF EXISTS favorites_delete_own ON public.favorites;
    CREATE POLICY favorites_select_own
      ON public.favorites FOR SELECT TO authenticated
      USING (user_id::text = auth.uid()::text);
    CREATE POLICY favorites_insert_own
      ON public.favorites FOR INSERT TO authenticated
      WITH CHECK (user_id::text = auth.uid()::text);
    CREATE POLICY favorites_delete_own
      ON public.favorites FOR DELETE TO authenticated
      USING (user_id::text = auth.uid()::text);
  END IF;

  IF to_regclass('public.user_product_clickouts') IS NOT NULL THEN
    ALTER TABLE public.user_product_clickouts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS user_product_clickouts_select_own ON public.user_product_clickouts;
    DROP POLICY IF EXISTS user_product_clickouts_insert_own ON public.user_product_clickouts;
    CREATE POLICY user_product_clickouts_select_own
      ON public.user_product_clickouts FOR SELECT TO authenticated
      USING (user_id::text = auth.uid()::text);
    CREATE POLICY user_product_clickouts_insert_own
      ON public.user_product_clickouts FOR INSERT TO authenticated
      WITH CHECK (user_id::text = auth.uid()::text);
  END IF;
  IF to_regclass('public.price_watches') IS NOT NULL THEN
    ALTER TABLE public.price_watches ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage their own price watches" ON public.price_watches;
    DROP POLICY IF EXISTS price_watches_own ON public.price_watches;
    CREATE POLICY price_watches_own
      ON public.price_watches FOR ALL TO authenticated
      USING (user_id::text = auth.uid()::text)
      WITH CHECK (user_id::text = auth.uid()::text);
  END IF;

  IF to_regclass('public.quiz_results') IS NOT NULL THEN
    ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own quiz results" ON public.quiz_results;
    DROP POLICY IF EXISTS "Users can insert quiz results" ON public.quiz_results;
    DROP POLICY IF EXISTS quiz_results_select_own ON public.quiz_results;
    DROP POLICY IF EXISTS quiz_results_insert_own ON public.quiz_results;
    CREATE POLICY quiz_results_select_own
      ON public.quiz_results FOR SELECT TO authenticated
      USING (user_id::text = auth.uid()::text);
    CREATE POLICY quiz_results_insert_own
      ON public.quiz_results FOR INSERT TO authenticated
      WITH CHECK (user_id::text = auth.uid()::text);
  END IF;
END $$;
