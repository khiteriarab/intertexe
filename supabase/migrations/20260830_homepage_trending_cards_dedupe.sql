-- Disable legacy duplicate trending card ids after seeding trending-* rows.
-- Keeps exactly four enabled cards on Home (quiz, cotton, cashmere, silk).

UPDATE public.homepage_trending_cards
SET enabled = false, updated_at = now()
WHERE id IN ('quiz', 'cotton', 'linen', 'silk', 'khiteri-edit');
