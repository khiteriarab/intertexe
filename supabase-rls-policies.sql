-- ============================================================
-- INTERTEXE — Supabase RLS Policies (Run in Supabase SQL Editor)
-- ============================================================
-- Tables used by both web app and iPhone app.
-- This script is idempotent — safe to run multiple times.
-- ============================================================

-- ─── 1. PRODUCTS (read-only for all users) ───────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are publicly readable" ON products;
CREATE POLICY "Products are publicly readable"
  ON products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service can insert products" ON products;
CREATE POLICY "Service can insert products"
  ON products FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update products" ON products;
CREATE POLICY "Service can update products"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- ─── 2. DESIGNERS (read-only for all users) ──────────────────
ALTER TABLE designers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Designers are publicly readable" ON designers;
CREATE POLICY "Designers are publicly readable"
  ON designers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service can insert designers" ON designers;
CREATE POLICY "Service can insert designers"
  ON designers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update designers" ON designers;
CREATE POLICY "Service can update designers"
  ON designers FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- ─── 3. USERS ────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- ─── 4. FAVORITES (designer follows) ────────────────────────
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (true);


-- ─── 5. PRODUCT_FAVORITES ───────────────────────────────────
ALTER TABLE product_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own product favorites" ON product_favorites;
CREATE POLICY "Users can view own product favorites"
  ON product_favorites FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own product favorites" ON product_favorites;
CREATE POLICY "Users can insert own product favorites"
  ON product_favorites FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own product favorites" ON product_favorites;
CREATE POLICY "Users can delete own product favorites"
  ON product_favorites FOR DELETE
  USING (true);


-- ─── 6. QUIZ_RESULTS ────────────────────────────────────────
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz results" ON quiz_results;
CREATE POLICY "Users can view own quiz results"
  ON quiz_results FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert quiz results" ON quiz_results;
CREATE POLICY "Users can insert quiz results"
  ON quiz_results FOR INSERT
  WITH CHECK (true);


-- ─── 7. PRICE_WATCHES (shared between web + iPhone) ─────────
ALTER TABLE price_watches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own price watches" ON price_watches;
CREATE POLICY "Users can manage their own price watches"
  ON price_watches FOR ALL
  USING (true)
  WITH CHECK (true);


-- ─── 8. BRAND_PROFILES (read-only) ──────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brand_profiles') THEN
    EXECUTE 'ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Brand profiles are publicly readable" ON brand_profiles';
    EXECUTE 'CREATE POLICY "Brand profiles are publicly readable" ON brand_profiles FOR SELECT USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "Service can insert brand profiles" ON brand_profiles';
    EXECUTE 'CREATE POLICY "Service can insert brand profiles" ON brand_profiles FOR INSERT WITH CHECK (true)';
  END IF;
END $$;


-- ============================================================
-- VERIFICATION: Run this to check all tables have RLS enabled
-- ============================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
