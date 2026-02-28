CREATE TABLE IF NOT EXISTS product_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  product_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_favorites_user_id ON product_favorites(user_id);

ALTER TABLE product_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON product_favorites FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own favorites"
  ON product_favorites FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own favorites"
  ON product_favorites FOR DELETE
  USING (true);
