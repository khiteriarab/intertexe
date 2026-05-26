-- Pre-launch: push tokens, wishlist price tracking, product price check metadata

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text DEFAULT 'ios',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_user ON public.user_push_tokens(user_id);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_token_own ON public.user_push_tokens;
CREATE POLICY push_token_own ON public.user_push_tokens
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_token_service ON public.user_push_tokens;
CREATE POLICY push_token_service ON public.user_push_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.product_favorites
  ADD COLUMN IF NOT EXISTS saved_price decimal(10,2),
  ADD COLUMN IF NOT EXISTS saved_currency text,
  ADD COLUMN IF NOT EXISTS price_at_save decimal(10,2);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS last_price_check timestamptz,
  ADD COLUMN IF NOT EXISTS stock_status text;
