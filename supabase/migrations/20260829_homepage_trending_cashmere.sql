-- Swap Linen → Cashmere in homepage trending grid (iOS + any remote-driven clients).

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
