-- Homepage Trending grid: remotely editable editorial cards (iOS Home).
-- Docs: docs/HOMEPAGE_TRENDING_CARDS.md
--
-- Copy / image / link changes here do NOT require an App Store release.
-- Rebuild iOS only when changing Swift defaults or tap routing logic.

CREATE TABLE IF NOT EXISTS public.homepage_trending_cards (
  id          text PRIMARY KEY,
  sort_order  smallint NOT NULL DEFAULT 0,
  eyebrow     text,
  title       text NOT NULL,
  subtitle    text,
  cta_label   text,
  image_url   text,
  link_type   text NOT NULL DEFAULT 'collection',
  link_value  text,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.homepage_trending_cards IS
  'Remote-editable Trending cards on iOS Home. Anon read of enabled rows only.';

COMMENT ON COLUMN public.homepage_trending_cards.link_type IS
  'quiz | fiber | category | collection | external | tab';

ALTER TABLE public.homepage_trending_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS homepage_trending_cards_public_read ON public.homepage_trending_cards;
CREATE POLICY homepage_trending_cards_public_read
  ON public.homepage_trending_cards
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

-- Seed defaults (matches iOS offline fallback). ON CONFLICT preserves manual edits to title/copy.
INSERT INTO public.homepage_trending_cards (
  id, sort_order, title, subtitle, cta_label, image_url, link_type, link_value, enabled
) VALUES
  (
    'trending-quiz', 10,
    'Find your fabric persona',
    'A 1-minute quiz that finds your material identity.',
    'Take the quiz',
    'https://images.pexels.com/photos/32965721/pexels-photo-32965721.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'quiz', NULL, true
  ),
  (
    'trending-cotton', 20,
    'Cotton',
    'Soft, breathable, everyday essentials.',
    'Shop cotton',
    'https://www.intertexe.com/fabrics/fabric-cotton.jpg',
    'fiber', 'cotton', true
  ),
  (
    'trending-cashmere', 30,
    'Cashmere',
    'Warm, soft, and endlessly luxurious.',
    'Shop cashmere',
    'https://www.intertexe.com/fabrics/fabric-cashmere.jpg',
    'fiber', 'cashmere', true
  ),
  (
    'trending-silk', 40,
    'Silk',
    'Fluid, luminous, and endlessly elegant.',
    'Shop silk',
    'https://www.intertexe.com/fabrics/fabric-silk.jpg',
    'fiber', 'silk', true
  )
ON CONFLICT (id) DO NOTHING;

-- Legacy Linen tile → Cashmere (idempotent; keeps existing row id).
UPDATE public.homepage_trending_cards
SET
  title = 'Cashmere',
  subtitle = 'Warm, soft, and endlessly luxurious.',
  cta_label = 'Shop cashmere',
  image_url = 'https://www.intertexe.com/fabrics/fabric-cashmere.jpg',
  link_type = 'fiber',
  link_value = 'cashmere',
  updated_at = now()
WHERE lower(coalesce(link_value, '')) = 'linen'
   OR lower(title) = 'linen'
   OR id ILIKE '%linen%';
